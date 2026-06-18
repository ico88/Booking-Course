import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from flask import current_app
from .models import Impostazione


def _get_smtp_config() -> dict:
    return {
        "host": Impostazione.get("smtp_host") or current_app.config.get("MAIL_SERVER", ""),
        "port": int(Impostazione.get("smtp_port") or current_app.config.get("MAIL_PORT", 587)),
        "user": Impostazione.get("smtp_user") or current_app.config.get("MAIL_USERNAME", ""),
        "password": Impostazione.get("smtp_password") or current_app.config.get("MAIL_PASSWORD", ""),
        "from_name": Impostazione.get("smtp_from_name") or current_app.config.get("APP_NAME", "Gestione Corsi"),
        "from_addr": Impostazione.get("smtp_user") or current_app.config.get("MAIL_DEFAULT_SENDER", ""),
    }


_SCHEME_COLORS = {
    "rosso": "#b91c1c",
    "verde": "#15803d",
    "blu": "#1d4ed8",
}


def _html_wrapper(content: str, app_name: str, app_url: str, logo_url: str = "", legal: dict = None, color_scheme: str = "blu") -> str:
    legal = legal or {}
    header_color = _SCHEME_COLORS.get(color_scheme, "#1d4ed8")
    # Recolor buttons in content to match scheme
    content = content.replace("background:#1d4ed8", f"background:{header_color}")
    logo_html = ""
    if logo_url:
        full_logo = logo_url if logo_url.startswith("http") else f"{app_url}{logo_url}"
        logo_html = f'<img src="{full_logo}" alt="{app_name}" style="max-height:48px;max-width:180px;object-fit:contain;display:block;margin:0 auto 12px auto">'

    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:600px;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)" cellpadding="0" cellspacing="0">

      <!-- HEADER -->
      <tr><td style="background-color:{header_color};padding:24px 32px;text-align:center">
        {logo_html}
        <div style="color:#ffffff;font-size:20px;font-weight:700">{app_name}</div>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background-color:#ffffff;padding:32px;color:#374151;font-size:15px;line-height:1.7">
        {content}
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background-color:#f3f4f6;padding:20px 32px;text-align:center">
        <div style="margin-bottom:12px">
          <a href="{app_url}" style="color:#2563eb;text-decoration:none;font-size:13px;font-weight:500">Sito Web</a>
          <span style="color:#d1d5db;margin:0 8px">|</span>
          <a href="{app_url}/dashboard" style="color:#2563eb;text-decoration:none;font-size:13px;font-weight:500">Portale</a>
          <span style="color:#d1d5db;margin:0 8px">|</span>
          <a href="{app_url}/dashboard" style="color:#2563eb;text-decoration:none;font-size:13px;font-weight:500">Dashboard</a>
        </div>
        <div style="font-size:11px;color:#9ca3af;line-height:1.6">
          Questa email è stata inviata da {app_name}.<br>
          Se hai ricevuto questa email per errore, ti preghiamo di ignorarla.<br>
          &copy; 2026 {app_name}. Tutti i diritti riservati.
        </div>
        {_legal_block(legal, app_url)}
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>"""


def send_email(to: str, subject: str, html_body: str):
    cfg = _get_smtp_config()
    if not cfg["host"] or not cfg["user"]:
        current_app.logger.warning("SMTP non configurato, email non inviata a %s", to)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{cfg['from_name']} <{cfg['from_addr']}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
            server.ehlo()
            server.starttls()
            server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["from_addr"], [to], msg.as_string())
    except Exception as e:
        current_app.logger.error("Errore invio email a %s: %s", to, e)
        raise


def send_email_bulk(messages: list):
    """Invia una lista di (to, subject, html_body) su una singola connessione SMTP.
    Riconnette automaticamente se la connessione cade."""
    cfg = _get_smtp_config()
    if not cfg["host"] or not cfg["user"]:
        current_app.logger.warning("SMTP non configurato, invio bulk annullato.")
        return 0

    sent = 0
    server = None

    def _connect():
        s = smtplib.SMTP(cfg["host"], cfg["port"], timeout=30)
        s.ehlo()
        s.starttls()
        s.login(cfg["user"], cfg["password"])
        return s

    try:
        server = _connect()
        for to, subject, html_body in messages:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{cfg['from_name']} <{cfg['from_addr']}>"
            msg["To"] = to
            msg.attach(MIMEText(html_body, "html", "utf-8"))
            try:
                server.sendmail(cfg["from_addr"], [to], msg.as_string())
                sent += 1
            except smtplib.SMTPServerDisconnected:
                # Riconnette e riprova una volta
                try:
                    server = _connect()
                    server.sendmail(cfg["from_addr"], [to], msg.as_string())
                    sent += 1
                except Exception as e:
                    current_app.logger.warning("Errore invio bulk a %s: %s", to, e)
            except Exception as e:
                current_app.logger.warning("Errore invio bulk a %s: %s", to, e)
    except Exception as e:
        current_app.logger.error("Errore connessione SMTP bulk: %s", e)
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass

    return sent


# ---------------------------------------------------------------------------
# Template helpers
# ---------------------------------------------------------------------------

def _ctx():
    app_name = Impostazione.get("app_name") or current_app.config.get("APP_NAME", "Gestione Corsi")
    app_url = (Impostazione.get("app_url") or current_app.config.get("APP_URL", "")).rstrip("/")
    _logo_raw = Impostazione.get("logo_url") or ""
    if _logo_raw and not _logo_raw.startswith("/") and not _logo_raw.startswith("http"):
        logo_url = f"/static/{_logo_raw}"
    else:
        logo_url = _logo_raw
    legal = {
        "ragione_sociale": Impostazione.get("ragione_sociale") or "",
        "partita_iva": Impostazione.get("partita_iva") or "",
        "indirizzo_sede": Impostazione.get("indirizzo_sede") or "",
    }
    color_scheme = Impostazione.get("color_scheme") or "blu"
    return app_name, app_url, logo_url, legal, color_scheme


def _legal_block(legal: dict, app_url: str) -> str:
    rs = legal.get("ragione_sociale", "")
    piva = legal.get("partita_iva", "")
    addr = legal.get("indirizzo_sede", "")
    if not any([rs, piva, addr]):
        return ""
    lines = []
    if rs:
        lines.append(f'<strong style="color:#374151">{rs}</strong>')
    if piva:
        lines.append(f'P.IVA: {piva}')
    if addr:
        lines.append(addr)
    content = "<br>".join(lines)
    return (
        f'<div style="border-top:1px solid #e5e7eb;margin-top:16px;padding-top:14px">'
        f'<div style="font-size:12px;color:#6b7280;line-height:1.8;margin-bottom:8px">{content}</div>'
        f'<div>'
        f'<a href="{app_url}/privacy-policy" style="color:#2563eb;font-size:12px;text-decoration:none">Privacy Policy</a>'
        f'<span style="color:#d1d5db;margin:0 6px">|</span>'
        f'<a href="{app_url}/termini-e-condizioni" style="color:#2563eb;font-size:12px;text-decoration:none">Termini di Servizio</a>'
        f'</div></div>'
    )


def _btn(url: str, label: str) -> str:
    return (
        f'<div style="margin:24px 0">'
        f'<a href="{url}" style="display:inline-block;background:#1d4ed8;color:#ffffff !important;'
        f'padding:12px 24px;border-radius:6px;text-decoration:none !important;font-weight:600;'
        f'font-size:15px">{label}</a></div>'
    )


def _info_box(html: str) -> str:
    return (
        f'<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;'
        f'padding:16px;margin:16px 0;font-size:14px;color:#374151;line-height:1.7">{html}</div>'
    )


def _h2(text: str) -> str:
    return f'<h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 16px 0">{text}</h2>'


def _p(text: str) -> str:
    return f'<p style="color:#374151;font-size:14px;margin:0 0 12px 0;line-height:1.7">{text}</p>'


def _small(text: str) -> str:
    return f'<p style="color:#6b7280;font-size:12px;margin:20px 0 0 0;line-height:1.6">{text}</p>'


def invia_email_benvenuto(utente):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    body = (
        _h2(f"Benvenuto, {utente.nome}!")
        + _p(f"Il tuo account è stato creato con successo su <strong style='color:#111827'>{app_name}</strong>.")
        + _p("Puoi accedere alla tua area personale cliccando il pulsante qui sotto:")
        + _btn(f"{app_url}/dashboard", "Vai alla dashboard")
    )
    send_email(utente.email, f"Benvenuto su {app_name}!", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))


def invia_email_verifica_account(utente, link: str):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    body = (
        _h2("Verifica il tuo account")
        + _p(f"Ciao <strong style='color:#111827'>{utente.nome}</strong>,")
        + _p("Grazie per esserti registrato. Per completare la registrazione, clicca sul pulsante qui sotto:")
        + _btn(link, "Verifica Account")
        + _p("Se il pulsante non funziona, copia e incolla questo link nel browser:")
        + f'<p style="color:#7c3aed;font-size:13px;word-break:break-all;margin:0 0 16px 0">{link}</p>'
        + _small("Se non hai richiesto questa registrazione, ignora questa email.")
    )
    send_email(utente.email, f"Verifica il tuo account - {app_name}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))


def invia_email_prenotazione(prenotazione):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    u = prenotazione.utente
    c = prenotazione.corso
    importo = prenotazione.importo_totale
    scadenza = prenotazione.scadenza_pagamento.strftime("%d/%m/%Y %H:%M") if prenotazione.scadenza_pagamento else "N/D"
    coord = c.coordinate_bancarie or ""
    riepilogo = (
        f"Corso: <strong style='color:#111827'>{c.titolo}</strong><br>"
        f"Posti: {prenotazione.numero_posti}<br>"
        f"Importo totale: <strong style='color:#111827'>€ {importo:.2f}</strong><br>"
        f"Scadenza pagamento: {scadenza}"
    )
    body = (
        _h2("Prenotazione ricevuta")
        + _p(f"Ciao <strong style='color:#111827'>{u.nome}</strong>, la tua prenotazione per <strong style='color:#111827'>{c.titolo}</strong> è stata registrata.")
        + _info_box(riepilogo)
        + (_info_box(f"<strong style='color:#111827'>Dati bonifico:</strong><br><code style='font-size:13px;color:#a1a1aa'>{coord}</code>") if coord else "")
        + _btn(f"{app_url}/dashboard/prenotazioni/{prenotazione.id}", "Gestisci prenotazione")
    )
    send_email(u.email, f"Prenotazione per {c.titolo}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))


def invia_email_contabile_caricata(prenotazione):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    u = prenotazione.utente
    c = prenotazione.corso
    body = (
        _h2("Pagamento ricevuto")
        + _p(f"Ciao <strong style='color:#111827'>{u.nome}</strong>, abbiamo ricevuto la tua ricevuta di pagamento per <strong style='color:#111827'>{c.titolo}</strong>.")
        + _p("La segreteria verificherà il pagamento e confermerà la tua iscrizione a breve.")
        + _btn(f"{app_url}/dashboard/prenotazioni/{prenotazione.id}", "Visualizza prenotazione")
    )
    send_email(u.email, f"Pagamento ricevuto - {c.titolo}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))


def invia_email_conferma_prenotazione(prenotazione):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    u = prenotazione.utente
    c = prenotazione.corso

    # Formato date/orari
    def _fmt(dt):
        if not dt:
            return "Da definire"
        if not dt.tzinfo:
            from datetime import timezone
            dt = dt.replace(tzinfo=timezone.utc)
        _giorni = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"]
        _mesi = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
                 "luglio","agosto","settembre","ottobre","novembre","dicembre"]
        return f"{_giorni[dt.weekday()]} {dt.day} {_mesi[dt.month-1]} {dt.year}, ore {dt.strftime('%H:%M')}"

    data_inizio_str = _fmt(c.data_inizio)
    data_fine_str = _fmt(c.data_fine) if c.data_fine else None

    # Riepilogo corso
    righe = [f"<strong style='color:#111827;font-size:16px'>{c.titolo}</strong>"]
    righe.append(f"📅 <strong>Data:</strong> {data_inizio_str}")
    if data_fine_str:
        righe.append(f"🏁 <strong>Fine:</strong> {data_fine_str}")
    if c.durata:
        righe.append(f"⏱ <strong>Durata:</strong> {c.durata}")
    if c.luogo:
        righe.append(f"📍 <strong>Luogo:</strong> {c.luogo}")
    righe.append(f"👥 <strong>Posti prenotati:</strong> {prenotazione.numero_posti}")

    riepilogo_html = "<br>".join(righe)

    # Link Google Calendar
    gcal_link = ""
    if c.data_inizio:
        from datetime import timezone as _tz
        _di = c.data_inizio if c.data_inizio.tzinfo else c.data_inizio.replace(tzinfo=_tz.utc)
        _df = (c.data_fine if c.data_fine else c.data_inizio)
        _df = _df if _df.tzinfo else _df.replace(tzinfo=_tz.utc)
        _start = _di.strftime("%Y%m%dT%H%M%SZ")
        _end   = _df.strftime("%Y%m%dT%H%M%SZ")
        _location = c.luogo or ""
        _details = f"Prenotazione confermata su {app_name}"
        import urllib.parse
        gcal_params = urllib.parse.urlencode({
            "action": "TEMPLATE",
            "text": c.titolo,
            "dates": f"{_start}/{_end}",
            "details": _details,
            "location": _location,
        })
        gcal_link = f"https://calendar.google.com/calendar/render?{gcal_params}"

    # Link .ics
    ics_link = f"{app_url}/dashboard/prenotazioni/{prenotazione.id}/ics"

    calendario_html = ""
    if gcal_link:
        calendario_html = (
            f'<div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">'
            f'<p style="margin:0 0 10px 0;font-size:14px;font-weight:600;color:#15803d">📆 Aggiungi al calendario</p>'
            f'<a href="{gcal_link}" target="_blank" style="display:inline-block;margin-right:10px;margin-bottom:6px;'
            f'background:#ffffff;border:1px solid #d1d5db;color:#374151;padding:8px 14px;border-radius:6px;'
            f'text-decoration:none;font-size:13px;font-weight:500">🗓 Google Calendar</a>'
            f'<a href="{ics_link}" style="display:inline-block;margin-bottom:6px;'
            f'background:#ffffff;border:1px solid #d1d5db;color:#374151;padding:8px 14px;border-radius:6px;'
            f'text-decoration:none;font-size:13px;font-weight:500">📥 Scarica .ics (Apple / Outlook)</a>'
            f'</div>'
        )

    body = (
        _h2("🎉 Iscrizione confermata!")
        + _p(f"Ciao <strong style='color:#111827'>{u.nome}</strong>, la tua iscrizione è stata <strong style='color:#16a34a'>confermata</strong>. Ti aspettiamo!")
        + _info_box(riepilogo_html)
        + calendario_html
        + _btn(f"{app_url}/dashboard/prenotazioni/{prenotazione.id}", "Visualizza la mia prenotazione")
        + _small("Conserva questa email come conferma della tua iscrizione.")
    )
    send_email(u.email, f"✅ Iscrizione confermata - {c.titolo}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))


def invia_email_attestato(prenotazione):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    u = prenotazione.utente
    c = prenotazione.corso
    body = (
        _h2("Il tuo attestato è disponibile")
        + _p(f"Ciao <strong style='color:#111827'>{u.nome}</strong>, il tuo attestato di partecipazione al corso <strong style='color:#111827'>{c.titolo}</strong> è ora disponibile.")
        + _btn(f"{app_url}/dashboard/prenotazioni/{prenotazione.id}", "Scarica attestato")
    )
    send_email(u.email, f"Attestato disponibile - {c.titolo}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))


def invia_email_reset_password(utente, link: str):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    body = (
        _h2("Recupero password")
        + _p(f"Ciao <strong style='color:#111827'>{utente.nome}</strong>, hai richiesto il recupero della password.")
        + _p("Clicca il pulsante qui sotto per impostare una nuova password (il link scade tra 1 ora):")
        + _btn(link, "Reimposta password")
        + _p("Se il pulsante non funziona, copia e incolla questo link nel browser:")
        + f'<p style="color:#7c3aed;font-size:13px;word-break:break-all;margin:0 0 16px 0">{link}</p>'
        + _small("Se non hai richiesto il recupero, ignora questa email.")
    )
    send_email(utente.email, f"Recupero password - {app_name}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))


def invia_email_notifica_segreteria(soggetto: str, messaggio: str):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    admin_email = Impostazione.get("smtp_user") or current_app.config.get("MAIL_USERNAME", "")
    if not admin_email:
        return
    body = _h2(soggetto) + _p(messaggio)
    try:
        send_email(admin_email, f"[{app_name}] {soggetto}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))
    except Exception:
        pass


def _build_marketing_html(lead, corso, unsub_token: str) -> tuple:
    """Restituisce (to, subject, html_body) senza inviare."""
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    unsub_url = f"{app_url}/disiscrivi?email={lead.email}&token={unsub_token}"
    data_str = corso.data_inizio.strftime("%d/%m/%Y") if corso.data_inizio else "Da definire"
    img_html = ""
    if corso.immagine_url:
        full_img = corso.immagine_url if corso.immagine_url.startswith("http") else f"{app_url}{corso.immagine_url}"
        img_html = f'<img src="{full_img}" style="max-width:100%;border-radius:10px;margin:0 0 20px 0;display:block" alt="">'
    riepilogo = (
        f"Data: <strong style='color:#111827'>{data_str}</strong><br>"
        f"Luogo: {corso.luogo or 'Da definire'}<br>"
        f"Costo: {corso.costo_formattato}"
    )
    body = (
        _h2("Nuovo corso disponibile")
        + img_html
        + f'<h3 style="color:#111827;font-size:18px;margin:0 0 12px 0">{corso.titolo}</h3>'
        + _info_box(riepilogo)
        + _btn(f"{app_url}/corsi/{corso.id}", "Scopri il corso")
        + f'<p style="color:#52525b;font-size:11px;margin-top:32px;line-height:1.6">'
        f'Ricevi queste email perché sei iscritto alle notifiche di {app_name}.<br>'
        f'<a href="{unsub_url}" style="color:#7c3aed">Annulla iscrizione</a></p>'
    )
    return (lead.email, f"Nuovo corso: {corso.titolo}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))


def invia_email_marketing(lead, corso, unsub_token: str):
    to, subject, html = _build_marketing_html(lead, corso, unsub_token)
    send_email(to, subject, html)


def _build_marketing_html_bcc(corso) -> str:
    """Build marketing HTML for BCC mode (generic unsubscribe link, no personalized token)."""
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    unsub_url = f"{app_url}/disiscrivi"
    data_str = corso.data_inizio.strftime("%d/%m/%Y") if corso.data_inizio else "Da definire"
    img_html = ""
    if corso.immagine_url:
        full_img = corso.immagine_url if corso.immagine_url.startswith("http") else f"{app_url}{corso.immagine_url}"
        img_html = f'<img src="{full_img}" style="max-width:100%;border-radius:10px;margin:0 0 20px 0;display:block" alt="">'
    riepilogo = (
        f"Data: <strong style='color:#111827'>{data_str}</strong><br>"
        f"Luogo: {corso.luogo or 'Da definire'}<br>"
        f"Costo: {corso.costo_formattato}"
    )
    body = (
        _h2("Nuovo corso disponibile")
        + img_html
        + f'<h3 style="color:#111827;font-size:18px;margin:0 0 12px 0">{corso.titolo}</h3>'
        + _info_box(riepilogo)
        + _btn(f"{app_url}/corsi/{corso.id}", "Scopri il corso")
        + f'<p style="color:#52525b;font-size:11px;margin-top:32px;line-height:1.6">'
        f'Ricevi queste email perché sei iscritto alle notifiche di {app_name}.<br>'
        f'<a href="{unsub_url}" style="color:#7c3aed">Annulla iscrizione</a></p>'
    )
    return _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme)


def send_email_bcc(bcc_list: list, subject: str, html_body: str) -> int:
    """Send one email with all recipients in BCC (batches of 99 to respect limits)."""
    if not bcc_list:
        return 0
    cfg = _get_smtp_config()
    if not cfg["host"] or not cfg["user"]:
        current_app.logger.warning("SMTP non configurato, invio BCC annullato.")
        return 0

    BATCH_SIZE = 99
    sent_total = 0

    def _connect():
        s = smtplib.SMTP(cfg["host"], cfg["port"], timeout=30)
        s.ehlo()
        s.starttls()
        s.login(cfg["user"], cfg["password"])
        return s

    server = None
    try:
        server = _connect()
        for i in range(0, len(bcc_list), BATCH_SIZE):
            batch = bcc_list[i:i + BATCH_SIZE]
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{cfg['from_name']} <{cfg['from_addr']}>"
            msg["To"] = cfg["from_addr"]
            msg["Bcc"] = ", ".join(batch)
            msg.attach(MIMEText(html_body, "html", "utf-8"))
            try:
                server.sendmail(cfg["from_addr"], batch, msg.as_string())
                sent_total += len(batch)
            except smtplib.SMTPServerDisconnected:
                try:
                    server = _connect()
                    server.sendmail(cfg["from_addr"], batch, msg.as_string())
                    sent_total += len(batch)
                except Exception as e:
                    current_app.logger.warning("Errore invio BCC batch %d: %s", i, e)
            except Exception as e:
                current_app.logger.warning("Errore invio BCC batch %d: %s", i, e)
    except Exception as e:
        current_app.logger.error("Errore connessione SMTP BCC: %s", e)
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass

    return sent_total


def invia_email_verifica_lead(lead, verifica_url: str):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    body = (
        _h2("Conferma la tua email")
        + _p(f"Ciao{(' <strong>' + lead.nome + '</strong>') if lead.nome else ''}! Clicca il pulsante per confermare la tua iscrizione alle notifiche di <strong>{app_name}</strong>.")
        + _btn(verifica_url, "Conferma email")
        + _small("Il link scade tra 7 giorni.")
    )
    send_email(lead.email, f"Conferma la tua email - {app_name}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))


def invia_email_rifiuto_validazione(prenotazione, nota: str):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    u = prenotazione.utente
    c = prenotazione.corso
    body = (
        _h2("Prenotazione non confermata")
        + _p(f"Ciao <strong>{u.nome}</strong>, la tua prenotazione per <strong>{c.titolo}</strong> non è stata confermata.")
        + _info_box(f"<strong>Motivazione:</strong><br>{nota}")
        + _p("Puoi contattarci per ulteriori informazioni.")
        + _btn(f"{app_url}/corsi/{c.id}", "Vedi il corso")
    )
    send_email(u.email, f"Prenotazione non confermata - {c.titolo}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))


def invia_email_conferma_consenso_marketing(utente):
    app_name, app_url, logo_url, legal, color_scheme = _ctx()
    body = (
        _h2("Iscrizione alle notifiche confermata")
        + _p(f"Ciao <strong style='color:#111827'>{utente.nome}</strong>,")
        + _p(f"Hai attivato le comunicazioni di marketing su <strong style='color:#111827'>{app_name}</strong>. "
             f"Ti invieremo aggiornamenti sui nuovi corsi disponibili.")
        + _p("Puoi revocare il consenso o aggiornare le tue preferenze in qualsiasi momento dalla tua area personale:")
        + _btn(f"{app_url}/dashboard/dati-personali", "Gestisci preferenze")
        + _small(
            f"Hai ricevuto questa email perché hai attivato le comunicazioni di marketing su {app_name}. "
            f"Se non sei stato tu, <a href='{app_url}/dashboard/dati-personali'>accedi al portale</a> e disattiva il consenso."
        )
    )
    send_email(utente.email, f"Iscrizione alle notifiche - {app_name}", _html_wrapper(body, app_name, app_url, logo_url, legal, color_scheme))
