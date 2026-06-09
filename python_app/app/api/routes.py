from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user

from ..models import db, Prenotazione, Impostazione, StatoPrenotazione, MetodoPagamento

api_bp = Blueprint("api", __name__, url_prefix="/api")


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


# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------

@api_bp.route("/pagamento/stripe/crea-intento", methods=["POST"])
@login_required
def stripe_crea_intento():
    stripe = _get_stripe()
    if not stripe:
        return jsonify({"error": "Stripe non configurato"}), 400

    data = request.get_json()
    prenotazione_id = data.get("prenotazione_id")
    p = Prenotazione.query.get_or_404(prenotazione_id)

    if p.utente_id != current_user.id:
        return jsonify({"error": "Non autorizzato"}), 403
    if p.stato != StatoPrenotazione.IN_ATTESA_PAGAMENTO:
        return jsonify({"error": "Stato non valido"}), 400

    try:
        importo_centesimi = int(round(p.importo_totale * 100))
        intent = stripe.PaymentIntent.create(
            amount=importo_centesimi,
            currency="eur",
            metadata={"prenotazione_id": prenotazione_id},
        )
        return jsonify({"client_secret": intent.client_secret})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/pagamento/stripe/conferma", methods=["POST"])
@login_required
def stripe_conferma():
    data = request.get_json()
    prenotazione_id = data.get("prenotazione_id")
    payment_intent_id = data.get("payment_intent_id")

    p = Prenotazione.query.get_or_404(prenotazione_id)
    if p.utente_id != current_user.id:
        return jsonify({"error": "Non autorizzato"}), 403

    stripe = _get_stripe()
    if not stripe:
        return jsonify({"error": "Stripe non configurato"}), 400

    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status == "succeeded":
            p.stato = StatoPrenotazione.PAGAMENTO_CARICATO
            p.metodo_pagamento = MetodoPagamento.STRIPE
            p.id_transazione = payment_intent_id
            p.importo_pagato = intent.amount_received / 100
            db.session.commit()
            return jsonify({"ok": True})
        return jsonify({"error": "Pagamento non completato"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# PayPal
# ---------------------------------------------------------------------------

@api_bp.route("/pagamento/paypal/crea-ordine", methods=["POST"])
@login_required
def paypal_crea_ordine():
    import requests as req
    data = request.get_json()
    prenotazione_id = data.get("prenotazione_id")
    p = Prenotazione.query.get_or_404(prenotazione_id)

    if p.utente_id != current_user.id:
        return jsonify({"error": "Non autorizzato"}), 403

    client_id, client_secret, mode = _get_paypal_config()
    if not client_id:
        return jsonify({"error": "PayPal non configurato"}), 400

    base = "https://api-m.paypal.com" if mode == "live" else "https://api-m.sandbox.paypal.com"

    # Get access token
    token_resp = req.post(
        f"{base}/v1/oauth2/token",
        auth=(client_id, client_secret),
        data={"grant_type": "client_credentials"},
        timeout=10,
    )
    if token_resp.status_code != 200:
        return jsonify({"error": "Errore autenticazione PayPal"}), 500

    access_token = token_resp.json()["access_token"]

    order_resp = req.post(
        f"{base}/v2/checkout/orders",
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        json={
            "intent": "CAPTURE",
            "purchase_units": [{"amount": {"currency_code": "EUR", "value": f"{p.importo_totale:.2f}"}}],
        },
        timeout=10,
    )
    if order_resp.status_code not in (200, 201):
        return jsonify({"error": "Errore creazione ordine PayPal"}), 500

    order = order_resp.json()
    return jsonify({"order_id": order["id"]})


@api_bp.route("/pagamento/paypal/cattura", methods=["POST"])
@login_required
def paypal_cattura():
    import requests as req
    data = request.get_json()
    order_id = data.get("order_id")
    prenotazione_id = data.get("prenotazione_id")
    p = Prenotazione.query.get_or_404(prenotazione_id)

    if p.utente_id != current_user.id:
        return jsonify({"error": "Non autorizzato"}), 403

    client_id, client_secret, mode = _get_paypal_config()
    base = "https://api-m.paypal.com" if mode == "live" else "https://api-m.sandbox.paypal.com"

    token_resp = req.post(
        f"{base}/v1/oauth2/token",
        auth=(client_id, client_secret),
        data={"grant_type": "client_credentials"},
        timeout=10,
    )
    access_token = token_resp.json()["access_token"]

    capture_resp = req.post(
        f"{base}/v2/checkout/orders/{order_id}/capture",
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        timeout=10,
    )
    if capture_resp.status_code not in (200, 201):
        return jsonify({"error": "Errore cattura PayPal"}), 500

    cap_data = capture_resp.json()
    unit = cap_data.get("purchase_units", [{}])[0]
    payments = unit.get("payments", {})
    captures = payments.get("captures", [{}])
    amount = float(captures[0].get("amount", {}).get("value", 0)) if captures else 0

    p.stato = StatoPrenotazione.PAGAMENTO_CARICATO
    p.metodo_pagamento = MetodoPagamento.PAYPAL
    p.id_transazione = order_id
    p.importo_pagato = amount
    db.session.commit()
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Cron: rilascia posti scaduti
# ---------------------------------------------------------------------------

@api_bp.route("/cron/rilascia-posti", methods=["POST"])
def rilascia_posti():
    secret = request.headers.get("X-Cron-Secret", "")
    if secret != current_app.config.get("SECRET_KEY", ""):
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
    return jsonify({"rilasciate": count})
