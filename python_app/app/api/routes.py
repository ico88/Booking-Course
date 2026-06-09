import logging
import hmac as _hmac
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user

from ..models import db, Prenotazione, Impostazione, StatoPrenotazione, MetodoPagamento

api_bp = Blueprint("api", __name__, url_prefix="/api")
logger = logging.getLogger(__name__)


def _get_stripe():
    import stripe
    secret = Impostazione.get("stripe_secret_key") or current_app.config.get("STRIPE_SECRET_KEY", "")
    if not secret:
        return None
    stripe.api_key = secret
    return stripe


def _get_paypal_config():
    client_id = Impostazione.get("paypal_client_id") or current_app.config.get("PAYPAL_CLIENT_ID", "")
    client_secret = Impostazione.get("paypal_client_secret") or current_app.config.get("PAYPAL_CLIENT_SECRET", "")
    mode = Impostazione.get("paypal_mode") or current_app.config.get("PAYPAL_MODE", "sandbox")
    return client_id, client_secret, mode


@api_bp.route("/pagamento/stripe/crea-intento", methods=["POST"])
@login_required
def stripe_crea_intento():
    stripe = _get_stripe()
    if not stripe:
        return jsonify({"error": "Stripe non configurato"}), 400
    data = request.get_json(silent=True) or {}
    prenotazione_id = data.get("prenotazione_id")
    if not prenotazione_id:
        return jsonify({"error": "prenotazione_id mancante"}), 400
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.utente_id != current_user.id:
        return jsonify({"error": "Non autorizzato"}), 403
    if p.stato != StatoPrenotazione.IN_ATTESA_PAGAMENTO:
        return jsonify({"error": "Stato non valido"}), 400
    try:
        importo_centesimi = int(round(p.importo_totale * 100))
        if importo_centesimi <= 0:
            return jsonify({"error": "Importo non valido"}), 400
        intent = stripe.PaymentIntent.create(
            amount=importo_centesimi, currency="eur",
            metadata={"prenotazione_id": prenotazione_id, "utente_id": current_user.id},
        )
        return jsonify({"client_secret": intent.client_secret})
    except Exception as exc:
        logger.error("Errore Stripe: %s", exc)
        return jsonify({"error": "Errore interno"}), 500


@api_bp.route("/pagamento/stripe/conferma", methods=["POST"])
@login_required
def stripe_conferma():
    data = request.get_json(silent=True) or {}
    prenotazione_id = data.get("prenotazione_id")
    payment_intent_id = data.get("payment_intent_id")
    if not prenotazione_id or not payment_intent_id:
        return jsonify({"error": "Parametri mancanti"}), 400
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.utente_id != current_user.id:
        return jsonify({"error": "Non autorizzato"}), 403
    stripe = _get_stripe()
    if not stripe:
        return jsonify({"error": "Stripe non configurato"}), 400
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.metadata.get("prenotazione_id") != prenotazione_id:
            logger.warning("Stripe intent non corrisponde: %s vs %s", payment_intent_id, prenotazione_id)
            return jsonify({"error": "Pagamento non corrispondente"}), 400
        if intent.status != "succeeded":
            return jsonify({"error": "Pagamento non completato"}), 400
        expected_centesimi = int(round(p.importo_totale * 100))
        if intent.amount_received < expected_centesimi:
            logger.warning("Importo Stripe insufficiente: %d < %d", intent.amount_received, expected_centesimi)
            return jsonify({"error": "Importo non sufficiente"}), 400
        p.stato = StatoPrenotazione.PAGAMENTO_CARICATO
        p.metodo_pagamento = MetodoPagamento.STRIPE
        p.id_transazione = payment_intent_id
        p.importo_pagato = intent.amount_received / 100
        db.session.commit()
        return jsonify({"ok": True})
    except Exception as exc:
        logger.error("Errore conferma Stripe: %s", exc)
        return jsonify({"error": "Errore interno"}), 500


@api_bp.route("/pagamento/paypal/crea-ordine", methods=["POST"])
@login_required
def paypal_crea_ordine():
    import requests as req
    data = request.get_json(silent=True) or {}
    prenotazione_id = data.get("prenotazione_id")
    if not prenotazione_id:
        return jsonify({"error": "prenotazione_id mancante"}), 400
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.utente_id != current_user.id:
        return jsonify({"error": "Non autorizzato"}), 403
    if p.stato != StatoPrenotazione.IN_ATTESA_PAGAMENTO:
        return jsonify({"error": "Stato non valido"}), 400
    client_id, client_secret, mode = _get_paypal_config()
    if not client_id:
        return jsonify({"error": "PayPal non configurato"}), 400
    base = "https://api-m.paypal.com" if mode == "live" else "https://api-m.sandbox.paypal.com"
    try:
        token_resp = req.post(f"{base}/v1/oauth2/token", auth=(client_id, client_secret),
                              data={"grant_type": "client_credentials"}, timeout=10)
        if token_resp.status_code != 200:
            return jsonify({"error": "Errore autenticazione PayPal"}), 500
        access_token = token_resp.json()["access_token"]
        order_resp = req.post(f"{base}/v2/checkout/orders",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json={"intent": "CAPTURE",
                  "purchase_units": [{"amount": {"currency_code": "EUR", "value": f"{p.importo_totale:.2f}"},
                                      "custom_id": prenotazione_id}]},
            timeout=10)
        if order_resp.status_code not in (200, 201):
            return jsonify({"error": "Errore creazione ordine PayPal"}), 500
        return jsonify({"order_id": order_resp.json()["id"]})
    except Exception as exc:
        logger.error("Errore PayPal ordine: %s", exc)
        return jsonify({"error": "Errore interno"}), 500


@api_bp.route("/pagamento/paypal/cattura", methods=["POST"])
@login_required
def paypal_cattura():
    import requests as req
    data = request.get_json(silent=True) or {}
    order_id = data.get("order_id")
    prenotazione_id = data.get("prenotazione_id")
    if not order_id or not prenotazione_id:
        return jsonify({"error": "Parametri mancanti"}), 400
    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.utente_id != current_user.id:
        return jsonify({"error": "Non autorizzato"}), 403
    client_id, client_secret, mode = _get_paypal_config()
    base = "https://api-m.paypal.com" if mode == "live" else "https://api-m.sandbox.paypal.com"
    try:
        token_resp = req.post(f"{base}/v1/oauth2/token", auth=(client_id, client_secret),
                              data={"grant_type": "client_credentials"}, timeout=10)
        access_token = token_resp.json()["access_token"]
        capture_resp = req.post(f"{base}/v2/checkout/orders/{order_id}/capture",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            timeout=10)
        if capture_resp.status_code not in (200, 201):
            return jsonify({"error": "Errore cattura PayPal"}), 500
        cap_data = capture_resp.json()
        units = cap_data.get("purchase_units", [])
        unit_custom_id = units[0].get("custom_id", "") if units else ""
        if unit_custom_id and unit_custom_id != prenotazione_id:
            logger.warning("PayPal order custom_id mismatch: %s vs %s", unit_custom_id, prenotazione_id)
            return jsonify({"error": "Ordine non corrispondente"}), 400
        captures = units[0].get("payments", {}).get("captures", []) if units else []
        captured_amount = float(captures[0].get("amount", {}).get("value", 0)) if captures else 0
        captured_status = captures[0].get("status", "") if captures else ""
        if captured_status != "COMPLETED":
            return jsonify({"error": "Pagamento non completato"}), 400
        if captured_amount < p.importo_totale * 0.99:
            logger.warning("Importo PayPal insufficiente: %.2f < %.2f", captured_amount, p.importo_totale)
            return jsonify({"error": "Importo non sufficiente"}), 400
        p.stato = StatoPrenotazione.PAGAMENTO_CARICATO
        p.metodo_pagamento = MetodoPagamento.PAYPAL
        p.id_transazione = order_id
        p.importo_pagato = captured_amount
        db.session.commit()
        return jsonify({"ok": True})
    except Exception as exc:
        logger.error("Errore PayPal cattura: %s", exc)
        return jsonify({"error": "Errore interno"}), 500


@api_bp.route("/cron/rilascia-posti", methods=["POST"])
def rilascia_posti():
    expected = current_app.config.get("SECRET_KEY", "")
    auth_header = request.headers.get("Authorization", "")
    cron_header = request.headers.get("X-Cron-Secret", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else cron_header
    if not token or not _hmac.compare_digest(token, expected):
        return jsonify({"error": "Non autorizzato"}), 403
    now = datetime.now(timezone.utc)
    scadute = Prenotazione.query.filter(
        Prenotazione.stato == StatoPrenotazione.IN_ATTESA_PAGAMENTO,
        Prenotazione.scadenza_pagamento < now,
    ).all()
    count = 0
    for p in scadute:
        p.stato = StatoPrenotazione.SCADUTA
        if p.corso:
            p.corso.posti_occupati = max(0, (p.corso.posti_occupati or 0) - (p.numero_posti or 1))
        count += 1
    db.session.commit()
    logger.info("Cron: %d prenotazioni scadute", count)
    return jsonify({"rilasciate": count})
