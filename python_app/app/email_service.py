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


def _html_wrapper(content: str, app_name: str, app_url: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{{font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0}}
  .container{{max-width:600px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)}}
  .header{{background:#1d4ed8;padding:24px 32px}}
  .header h1{{color:#fff;margin:0;font-size:20px}}
  .body{{padding:32px}}
  .footer{{background:#f3f4f6;padding:16px 32px;font-size:12px;color:#6b7280;text-align:center}}
  .btn{{display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0}}
  .info-box{{background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:16px;margin:16px 0}}
</style></head>
<body>
<div class="container">
  <div class="header"><h1>{app_name}</h1></div>
  <div class="body">{content}</div>
  <div class="footer">
    &copy; {app_name} &mdash; <a href="{app_url}/privacy-policy">Privacy Policy</a>
  </div>
</div>
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


# ---------------------------------------------------------------------------
# Template helpers
# ---------------------------------------------------------------------------

def _ctx():
    app_name = Impostazione.get("app_name") or current_app.config.get("APP_NAME", "Gestione Corsi")
    app_url = current_app.config.get("APP_URL", "")
    return app_name, app_url


def invia_email_benvenuto(utente):
    app_name, app_url = _ctx()
    body = f"""
<h2>Benvenuto, {utente.nome}!</h2>
<p>Il tuo account è stato creato con successo su <strong>{app_name}</strong>.</p>
<p>Puoi accedere alla tua area personale cliccando il pulsante qui sotto:</p>
<a href="{app_url}/dashboard" class="btn">Vai alla dashboard</a>
"""
    send_email(utente.email, f"Benvenuto su {app_name}!", _html_wrapper(body, app_name, app_url))


def invia_email_prenotazione(prenotazione):
    app_name, app_url = _ctx()
    u = prenotazione.utente
    c = prenotazione.corso
    importo = prenotazione.importo_totale
    scadenza = prenotazione.scadenza_pagamento.strftime("%d/%m/%Y %H:%M") if prenotazione.scadenza_pagamento else "N/D"
    coord = c.coordinate_bancarie or ""
    body = f"""
<h2>Prenotazione ricevuta</h2>
<p>Ciao {u.nome}, la tua prenotazione per <strong>{c.titolo}</strong> è stata registrata.</p>
<div class="info-box">
  <strong>Riepilogo:</strong><br>
  Corso: {c.titolo}<br>
  Posti: {prenotazione.numero_posti}<br>
  Importo totale: <strong>€ {importo:.2f}</strong><br>
  Scadenza pagamento: {scadenza}
</div>
{f'<div class="info-box"><strong>Dati bonifico:</strong><br><pre>{coord}</pre></div>' if coord else ''}
<a href="{app_url}/dashboard/prenotazioni/{prenotazione.id}" class="btn">Gestisci prenotazione</a>
"""
    send_email(u.email, f"Prenotazione per {c.titolo}", _html_wrapper(body, app_name, app_url))


def invia_email_contabile_caricata(prenotazione):
    app_name, app_url = _ctx()
    u = prenotazione.utente
    c = prenotazione.corso
    body = f"""
<h2>Pagamento ricevuto</h2>
<p>Ciao {u.nome}, abbiamo ricevuto la tua ricevuta di pagamento per <strong>{c.titolo}</strong>.</p>
<p>La segreteria verificherà il pagamento e confermerà la tua iscrizione a breve.</p>
<a href="{app_url}/dashboard/prenotazioni/{prenotazione.id}" class="btn">Visualizza prenotazione</a>
"""
    send_email(u.email, f"Pagamento ricevuto - {c.titolo}", _html_wrapper(body, app_name, app_url))


def invia_email_conferma_prenotazione(prenotazione):
    app_name, app_url = _ctx()
    u = prenotazione.utente
    c = prenotazione.corso
    body = f"""
<h2>Iscrizione confermata!</h2>
<p>Ciao {u.nome}, la tua iscrizione al corso <strong>{c.titolo}</strong> è stata <strong>confermata</strong>.</p>
<p>Ti aspettiamo!</p>
<a href="{app_url}/dashboard/prenotazioni/{prenotazione.id}" class="btn">Dettagli iscrizione</a>
"""
    send_email(u.email, f"Iscrizione confermata - {c.titolo}", _html_wrapper(body, app_name, app_url))


def invia_email_attestato(prenotazione):
    app_name, app_url = _ctx()
    u = prenotazione.utente
    c = prenotazione.corso
    body = f"""
<h2>Il tuo attestato è disponibile</h2>
<p>Ciao {u.nome}, il tuo attestato di partecipazione al corso <strong>{c.titolo}</strong> è ora disponibile.</p>
<a href="{app_url}/dashboard/prenotazioni/{prenotazione.id}" class="btn">Scarica attestato</a>
"""
    send_email(u.email, f"Attestato disponibile - {c.titolo}", _html_wrapper(body, app_name, app_url))


def invia_email_reset_password(utente, link: str):
    app_name, app_url = _ctx()
    body = f"""
<h2>Recupero password</h2>
<p>Ciao {utente.nome}, hai richiesto il recupero della password.</p>
<p>Clicca il pulsante qui sotto per impostare una nuova password (il link scade tra 1 ora):</p>
<a href="{link}" class="btn">Reimposta password</a>
<p style="color:#6b7280;font-size:13px;">Se non hai richiesto il recupero, ignora questa email.</p>
"""
    send_email(utente.email, f"Recupero password - {app_name}", _html_wrapper(body, app_name, app_url))


def invia_email_notifica_segreteria(soggetto: str, messaggio: str):
    app_name, app_url = _ctx()
    admin_email = Impostazione.get("smtp_user") or current_app.config.get("MAIL_USERNAME", "")
    if not admin_email:
        return
    body = f"<h2>{soggetto}</h2><p>{messaggio}</p>"
    try:
        send_email(admin_email, f"[{app_name}] {soggetto}", _html_wrapper(body, app_name, app_url))
    except Exception:
        pass


def invia_email_marketing(lead, corso, unsub_token: str):
    app_name, app_url = _ctx()
    unsub_url = f"{app_url}/disiscrivi?email={lead.email}&token={unsub_token}"
    data_str = corso.data_inizio.strftime("%d/%m/%Y") if corso.data_inizio else "Da definire"
    img_html = f'<img src="{app_url}{corso.immagine_url}" style="max-width:100%;border-radius:6px;margin:16px 0" alt="">' if corso.immagine_url else ""
    body = f"""
<h2>Nuovo corso disponibile</h2>
{img_html}
<h3>{corso.titolo}</h3>
<div class="info-box">
  Data: {data_str}<br>
  Luogo: {corso.luogo or 'Da definire'}<br>
  Costo: {corso.costo_formattato}
</div>
<a href="{app_url}/corsi/{corso.id}" class="btn">Scopri il corso</a>
<p style="color:#9ca3af;font-size:11px;margin-top:32px">
  Ricevi queste email perché sei iscritto alle notifiche di {app_name}.<br>
  <a href="{unsub_url}">Annulla iscrizione</a>
</p>
"""
    send_email(lead.email, f"Nuovo corso: {corso.titolo}", _html_wrapper(body, app_name, app_url))


def invia_email_verifica_lead(lead, verifica_url: str):
    app_name, app_url = _ctx()
    body = f"""
<h2>Conferma la tua email</h2>
<p>Ciao{' ' + lead.nome if lead.nome else ''}! Clicca il pulsante per confermare la tua iscrizione alle notifiche di {app_name}.</p>
<a href="{verifica_url}" class="btn">Conferma email</a>
<p style="color:#6b7280;font-size:13px;">Il link scade tra 7 giorni.</p>
"""
    send_email(lead.email, f"Conferma la tua email - {app_name}", _html_wrapper(body, app_name, app_url))
