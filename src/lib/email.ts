import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const rows = await prisma.impostazione.findMany({
      where: { chiave: { in: ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_name"] } },
    });
    const m: Record<string, string> = {};
    rows.forEach((r) => { m[r.chiave] = r.valore; });

    return {
      host: m.smtp_host || process.env.SMTP_HOST || "",
      port: Number(m.smtp_port || process.env.SMTP_PORT) || 587,
      user: m.smtp_user || process.env.SMTP_USER || "",
      pass: m.smtp_password || process.env.SMTP_PASS || "",
      fromName: m.smtp_from_name || process.env.APP_NAME || "Gestione Corsi",
    };
  } catch {
    return {
      host: process.env.SMTP_HOST || "",
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      fromName: process.env.APP_NAME || "Gestione Corsi",
    };
  }
}

export function buildTransporter(cfg: SmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

async function getTransporter() {
  const cfg = await getSmtpConfig();
  return { transport: buildTransporter(cfg), cfg };
}

type MailOpts = { to: string; subject: string; html: string; list?: { unsubscribe: { url: string; comment: string } } };
async function send(opts: MailOpts) {
  const { transport, cfg } = await getTransporter();
  return transport.sendMail({ from: `"${cfg.fromName}" <${cfg.user}>`, ...opts });
}

const appName = process.env.APP_NAME || "Gestione Corsi";
const appUrl = process.env.APP_URL || "http://localhost:3000";

function layoutEmail(contenuto: string): string {
  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${appName}</title>
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            <tr>
              <td style="background:#dc2626;padding:24px 32px;">
                <h1 style="color:#ffffff;margin:0;font-size:22px;">${appName}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${contenuto}
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
                <p style="color:#64748b;font-size:12px;margin:0;">
                  Questa email è stata inviata automaticamente da ${appName}.
                  Non rispondere a questa email.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}

export async function inviaEmailBenvenuto(
  email: string,
  nome: string
): Promise<void> {
  const html = layoutEmail(`
    <h2 style="color:#1e293b;margin-top:0;">Benvenuto/a, ${nome}!</h2>
    <p style="color:#475569;line-height:1.6;">
      Il tuo account è stato creato con successo su <strong>${appName}</strong>.
    </p>
    <p style="color:#475569;line-height:1.6;">
      Ora puoi accedere alla piattaforma per visualizzare i corsi disponibili e prenotare il tuo posto.
    </p>
    <a href="${appUrl}/auth/login"
       style="display:inline-block;background:#dc2626;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px;">
      Accedi alla piattaforma
    </a>
  `);

  await send({
    to: email,
    subject: `Benvenuto/a su ${appName}`,
    html,
  });
}

export async function inviaEmailPrenotazione(
  email: string,
  nome: string,
  titoloCorso: string,
  numeroPosti: number,
  scadenzaPagamento: Date,
  coordinateBancarie: string,
  prenotazioneId: string
): Promise<void> {
  const scadenzaStr = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(scadenzaPagamento);

  const html = layoutEmail(`
    <h2 style="color:#1e293b;margin-top:0;">Prenotazione ricevuta!</h2>
    <p style="color:#475569;line-height:1.6;">
      Ciao <strong>${nome}</strong>, la tua prenotazione per il corso
      <strong>"${titoloCorso}"</strong> è stata registrata con successo.
    </p>

    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0 0 8px 0;font-weight:bold;color:#dc2626;">Dettagli prenotazione</p>
      <p style="margin:0;color:#475569;">Posti prenotati: <strong>${numeroPosti}</strong></p>
      <p style="margin:4px 0 0 0;color:#dc2626;font-weight:bold;">
        ⏰ Scadenza pagamento: ${scadenzaStr}
      </p>
    </div>

    <h3 style="color:#1e293b;">Coordinate bancarie per il bonifico</h3>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:6px;white-space:pre-line;font-family:monospace;color:#334155;">
${coordinateBancarie}
    </div>

    <p style="color:#475569;line-height:1.6;margin-top:20px;">
      <strong>Importante:</strong> effettua il bonifico e carica la ricevuta entro la scadenza indicata,
      altrimenti la prenotazione verrà annullata automaticamente e il posto liberato.
    </p>

    <a href="${appUrl}/dashboard/prenotazioni/${prenotazioneId}"
       style="display:inline-block;background:#dc2626;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Carica ricevuta bonifico
    </a>
  `);

  await send({
    to: email,
    subject: `Prenotazione corso: ${titoloCorso}`,
    html,
  });
}

export async function inviaEmailContabileCaricata(
  emailUtente: string,
  nomeUtente: string,
  titoloCorso: string
): Promise<void> {
  const html = layoutEmail(`
    <h2 style="color:#1e293b;margin-top:0;">Ricevuta caricata con successo</h2>
    <p style="color:#475569;line-height:1.6;">
      Ciao <strong>${nomeUtente}</strong>, abbiamo ricevuto la tua ricevuta di pagamento
      per il corso <strong>"${titoloCorso}"</strong>.
    </p>
    <p style="color:#475569;line-height:1.6;">
      La segreteria verificherà il bonifico e confermerà la tua iscrizione al più presto.
      Riceverai una notifica via email non appena la tua prenotazione sarà confermata.
    </p>
    <a href="${appUrl}/dashboard"
       style="display:inline-block;background:#dc2626;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Vai alla tua area personale
    </a>
  `);

  await send({
    to: emailUtente,
    subject: `Ricevuta ricevuta - ${titoloCorso}`,
    html,
  });
}

export async function inviaEmailConfermaPrenotazione(
  email: string,
  nome: string,
  titoloCorso: string,
  dataCorso: Date,
  noteSegreteria?: string | null
): Promise<void> {
  const dataStr = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dataCorso);

  const html = layoutEmail(`
    <h2 style="color:#16a34a;margin-top:0;">✅ Iscrizione confermata!</h2>
    <p style="color:#475569;line-height:1.6;">
      Ciao <strong>${nome}</strong>, la tua iscrizione al corso
      <strong>"${titoloCorso}"</strong> del <strong>${dataStr}</strong> è stata
      <strong>ufficialmente confermata</strong> dalla segreteria.
    </p>
    ${
      noteSegreteria
        ? `<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px;border-radius:4px;margin:16px 0;">
        <p style="margin:0;color:#166534;"><strong>Note dalla segreteria:</strong></p>
        <p style="margin:8px 0 0 0;color:#475569;">${noteSegreteria}</p>
      </div>`
        : ""
    }
    <p style="color:#475569;line-height:1.6;">
      Puoi visualizzare i dettagli della tua prenotazione nella tua area personale.
      Dopo il completamento del corso, il tuo attestato sarà disponibile per il download.
    </p>
    <a href="${appUrl}/dashboard"
       style="display:inline-block;background:#16a34a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Vai alla tua area personale
    </a>
  `);

  await send({
    to: email,
    subject: `✅ Iscrizione confermata - ${titoloCorso}`,
    html,
  });
}

export async function inviaEmailAttestato(
  email: string,
  nome: string,
  titoloCorso: string,
  prenotazioneId: string
): Promise<void> {
  const html = layoutEmail(`
    <h2 style="color:#1e293b;margin-top:0;">🎓 Il tuo attestato è disponibile!</h2>
    <p style="color:#475569;line-height:1.6;">
      Ciao <strong>${nome}</strong>, il tuo attestato di partecipazione al corso
      <strong>"${titoloCorso}"</strong> è ora disponibile per il download.
    </p>
    <a href="${appUrl}/dashboard/prenotazioni/${prenotazioneId}"
       style="display:inline-block;background:#7c3aed;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Scarica attestato
    </a>
  `);

  await send({
    to: email,
    subject: `🎓 Attestato disponibile - ${titoloCorso}`,
    html,
  });
}

export async function inviaEmailResetPassword(
  email: string,
  nome: string,
  token: string
): Promise<void> {
  const link = `${appUrl}/auth/nuova-password?token=${token}`;

  const html = layoutEmail(`
    <h2 style="color:#1e293b;margin-top:0;">Reset password</h2>
    <p style="color:#475569;line-height:1.6;">
      Ciao <strong>${nome}</strong>, hai richiesto il reset della password per il tuo account.
    </p>
    <p style="color:#475569;line-height:1.6;">
      Clicca il pulsante qui sotto per impostare una nuova password.
      Il link scade tra <strong>1 ora</strong>.
    </p>
    <a href="${link}"
       style="display:inline-block;background:#dc2626;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Reimposta password
    </a>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
      Se non hai richiesto il reset della password, ignora questa email.
    </p>
  `);

  await send({
    to: email,
    subject: `Reset password - ${appName}`,
    html,
  });
}

export async function inviaEmailNotificaSegreteria(
  emailSegreteria: string,
  tipoNotifica: "nuova_prenotazione" | "contabile_caricata",
  dati: {
    nomeUtente: string;
    titoloCorso: string;
    prenotazioneId: string;
  }
): Promise<void> {
  const titoli = {
    nuova_prenotazione: "Nuova prenotazione ricevuta",
    contabile_caricata: "Contabile caricata - verifica richiesta",
  };

  const html = layoutEmail(`
    <h2 style="color:#1e293b;margin-top:0;">📋 ${titoli[tipoNotifica]}</h2>
    <p style="color:#475569;line-height:1.6;">
      <strong>Utente:</strong> ${dati.nomeUtente}<br>
      <strong>Corso:</strong> ${dati.titoloCorso}
    </p>
    <a href="${appUrl}/admin/prenotazioni/${dati.prenotazioneId}"
       style="display:inline-block;background:#dc2626;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Gestisci prenotazione
    </a>
  `);

  await send({
    to: emailSegreteria,
    subject: `[${appName}] ${titoli[tipoNotifica]}`,
    html,
  });
}

export async function inviaEmailMarketing(
  email: string,
  nome: string,
  corso: {
    id: string;
    titolo: string;
    descrizione: string;
    dataInizio: Date;
    dataFine: Date | null;
    orario: string;
    luogo: string | null;
    costo: string;
    postiDisponibili: number;
    immagineUrl: string | null;
  },
  unsubscribeUrl: string
): Promise<void> {
  const dataInizioStr = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(corso.dataInizio);

  const dataFineStr = corso.dataFine
    ? new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(corso.dataFine)
    : null;

  const dataLabel = dataFineStr
    ? `${dataInizioStr} – ${dataFineStr}`
    : dataInizioStr;

  const immagineHtml = corso.immagineUrl
    ? `<tr><td style="padding:0;">
        <img src="${corso.immagineUrl}" alt="${corso.titolo}"
             style="width:100%;max-height:240px;object-fit:cover;display:block;" />
       </td></tr>`
    : `<tr><td style="background:#fef2f2;height:8px;"></td></tr>`;

  const descrizioneBreve =
    corso.descrizione.length > 300
      ? corso.descrizione.substring(0, 297) + "…"
      : corso.descrizione;

  const html = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${corso.titolo} - ${appName}</title>
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0"
                 style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

            <!-- Header -->
            <tr>
              <td style="background:#dc2626;padding:20px 32px;">
                <p style="color:rgba(255,255,255,0.8);margin:0 0 4px 0;font-size:13px;text-transform:uppercase;letter-spacing:1px;">
                  Nuovo corso disponibile
                </p>
                <h1 style="color:#ffffff;margin:0;font-size:24px;line-height:1.3;">${corso.titolo}</h1>
              </td>
            </tr>

            <!-- Immagine corso -->
            ${immagineHtml}

            <!-- Corpo -->
            <tr>
              <td style="padding:32px;">
                <p style="color:#475569;line-height:1.6;margin-top:0;">
                  Ciao <strong>${nome}</strong>,<br>
                  è disponibile un nuovo corso su <strong>${appName}</strong>. Dai un'occhiata!
                </p>

                <p style="color:#374151;line-height:1.7;margin:0 0 24px 0;">${descrizioneBreve}</p>

                <!-- Dettagli corso -->
                <table width="100%" cellpadding="0" cellspacing="0"
                       style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:28px;">
                  <tr>
                    <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:40%;">📅 Data</td>
                          <td style="color:#111827;font-weight:bold;font-size:14px;">${dataLabel}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:40%;">🕐 Orario</td>
                          <td style="color:#111827;font-weight:bold;font-size:14px;">${corso.orario}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  ${corso.luogo ? `
                  <tr>
                    <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:40%;">📍 Sede</td>
                          <td style="color:#111827;font-weight:bold;font-size:14px;">${corso.luogo}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:40%;">💶 Quota</td>
                          <td style="color:#dc2626;font-weight:bold;font-size:18px;">€ ${corso.costo}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;width:40%;">🪑 Posti</td>
                          <td style="color:#16a34a;font-weight:bold;font-size:14px;">${corso.postiDisponibili} disponibili</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- CTA -->
                <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td align="center">
                      <a href="${appUrl}/corsi/${corso.id}"
                         style="display:inline-block;background:#dc2626;color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
                        Prenota ora →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
                <p style="color:#64748b;font-size:12px;margin:0 0 8px 0;">
                  Hai ricevuto questa email perché hai acconsentito a ricevere comunicazioni sui nuovi corsi da <strong>${appName}</strong>.
                </p>
                <p style="color:#64748b;font-size:12px;margin:0;">
                  Non vuoi più ricevere queste email?
                  <a href="${unsubscribeUrl}" style="color:#dc2626;text-decoration:underline;">Disiscriviti qui</a>.
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  await send({
    to: email,
    subject: `🆕 Nuovo corso: ${corso.titolo}`,
    html,
    list: {
      unsubscribe: { url: unsubscribeUrl, comment: "Disiscriviti" },
    },
  });
}

// ── Lead marketing emails ─────────────────────────────────────────────────────

export async function inviaEmailVerificaLead(
  email: string,
  nome: string | null | undefined,
  linkConferma: string
): Promise<void> {
  const saluto = nome ? `Ciao <strong>${nome}</strong>` : "Ciao";
  const html = layoutEmail(`
    <h2 style="color:#1e293b;margin-top:0;">Conferma il tuo indirizzo email</h2>
    <p style="color:#475569;line-height:1.6;">
      ${saluto}, grazie per esserti iscritto alle notifiche corsi!
      Clicca il pulsante qui sotto per confermare il tuo indirizzo email e attivare le notifiche.
    </p>
    <p style="color:#475569;line-height:1.6;">
      Il link scade tra <strong>7 giorni</strong>.
    </p>
    <a href="${linkConferma}"
       style="display:inline-block;background:#dc2626;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Conferma email
    </a>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
      Se non ti sei iscritto, ignora questa email. Non riceverai ulteriori comunicazioni.
    </p>
  `);

  await send({ to: email, subject: `Conferma iscrizione notifiche corsi`, html });
}

export async function inviaEmailCorsoLead(
  lead: { email: string; nome: string | null; cognome: string | null },
  corso: {
    id: string;
    titolo: string;
    descrizione: string;
    dataInizio: Date;
    dataFine: Date | null;
    orario: string;
    luogo: string | null;
    costo: { toString(): string };
    postiTotali: number;
    postiOccupati: number;
    immagineUrl: string | null;
  },
  unsubscribeUrl: string
): Promise<void> {
  const nome = [lead.nome, lead.cognome].filter(Boolean).join(" ") || "Ciao";
  const dataInizioStr = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "long", year: "numeric",
  }).format(corso.dataInizio);
  const dataFineStr = corso.dataFine
    ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "long", year: "numeric" }).format(corso.dataFine)
    : null;
  const dataLabel = dataFineStr ? `${dataInizioStr} – ${dataFineStr}` : dataInizioStr;
  const costo = Number(corso.costo);
  const costoLabel = costo === 0 ? "Gratuito" : `€ ${corso.costo}`;
  const postiLiberi = corso.postiTotali - corso.postiOccupati;
  const descrizioneBreve = corso.descrizione.length > 300
    ? corso.descrizione.substring(0, 297) + "…"
    : corso.descrizione;

  const immagineHtml = corso.immagineUrl
    ? `<tr><td style="padding:0;"><img src="${corso.immagineUrl}" alt="${corso.titolo}" style="width:100%;max-height:240px;object-fit:cover;display:block;" /></td></tr>`
    : `<tr><td style="background:#fef2f2;height:8px;"></td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${corso.titolo} - ${appName}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
<tr><td style="background:#dc2626;padding:20px 32px;">
  <p style="color:rgba(255,255,255,0.8);margin:0 0 4px 0;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Nuovo corso disponibile</p>
  <h1 style="color:#fff;margin:0;font-size:24px;line-height:1.3;">${corso.titolo}</h1>
</td></tr>
${immagineHtml}
<tr><td style="padding:32px;">
  <p style="color:#475569;line-height:1.6;margin-top:0;">Ciao <strong>${nome}</strong>,<br>
  è disponibile un nuovo corso su <strong>${appName}</strong> che potrebbe interessarti!</p>
  <p style="color:#374151;line-height:1.7;margin:0 0 24px 0;">${descrizioneBreve}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:28px;">
    <tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
      <table width="100%"><tr>
        <td style="color:#6b7280;font-size:12px;text-transform:uppercase;width:40%;">📅 Data</td>
        <td style="color:#111827;font-weight:bold;font-size:14px;">${dataLabel}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
      <table width="100%"><tr>
        <td style="color:#6b7280;font-size:12px;text-transform:uppercase;width:40%;">🕐 Orario</td>
        <td style="color:#111827;font-weight:bold;font-size:14px;">${corso.orario}</td>
      </tr></table>
    </td></tr>
    ${corso.luogo ? `<tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;"><table width="100%"><tr><td style="color:#6b7280;font-size:12px;text-transform:uppercase;width:40%;">📍 Sede</td><td style="color:#111827;font-weight:bold;font-size:14px;">${corso.luogo}</td></tr></table></td></tr>` : ""}
    <tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
      <table width="100%"><tr>
        <td style="color:#6b7280;font-size:12px;text-transform:uppercase;width:40%;">💶 Quota</td>
        <td style="color:#dc2626;font-weight:bold;font-size:18px;">${costoLabel}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:14px 20px;">
      <table width="100%"><tr>
        <td style="color:#6b7280;font-size:12px;text-transform:uppercase;width:40%;">🪑 Posti</td>
        <td style="color:#16a34a;font-weight:bold;font-size:14px;">${postiLiberi} disponibili</td>
      </tr></table>
    </td></tr>
  </table>
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td align="center">
      <a href="${appUrl}/corsi/${corso.id}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
        Scopri il corso →
      </a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
  <p style="color:#64748b;font-size:12px;margin:0 0 8px 0;">
    Hai ricevuto questa email perché ti sei iscritto alle notifiche corsi di <strong>${appName}</strong>.
  </p>
  <p style="color:#64748b;font-size:12px;margin:0;">
    Non vuoi più ricevere queste email?
    <a href="${unsubscribeUrl}" style="color:#dc2626;text-decoration:underline;">Disiscriviti qui</a>.
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  await send({
    to: lead.email,
    subject: `🆕 Nuovo corso: ${corso.titolo}`,
    html,
    list: { unsubscribe: { url: unsubscribeUrl, comment: "Disiscriviti notifiche corsi" } },
  });
}
