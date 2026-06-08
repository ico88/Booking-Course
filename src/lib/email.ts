import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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
              <td style="background:#1e40af;padding:24px 32px;">
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
       style="display:inline-block;background:#1e40af;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px;">
      Accedi alla piattaforma
    </a>
  `);

  await transporter.sendMail({
    from: `"${appName}" <${process.env.SMTP_FROM}>`,
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

    <div style="background:#eff6ff;border-left:4px solid #1e40af;padding:16px;border-radius:4px;margin:20px 0;">
      <p style="margin:0 0 8px 0;font-weight:bold;color:#1e40af;">Dettagli prenotazione</p>
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
       style="display:inline-block;background:#1e40af;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Carica ricevuta bonifico
    </a>
  `);

  await transporter.sendMail({
    from: `"${appName}" <${process.env.SMTP_FROM}>`,
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
       style="display:inline-block;background:#1e40af;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Vai alla tua area personale
    </a>
  `);

  await transporter.sendMail({
    from: `"${appName}" <${process.env.SMTP_FROM}>`,
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

  await transporter.sendMail({
    from: `"${appName}" <${process.env.SMTP_FROM}>`,
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

  await transporter.sendMail({
    from: `"${appName}" <${process.env.SMTP_FROM}>`,
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

  await transporter.sendMail({
    from: `"${appName}" <${process.env.SMTP_FROM}>`,
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
       style="display:inline-block;background:#1e40af;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px;">
      Gestisci prenotazione
    </a>
  `);

  await transporter.sendMail({
    from: `"${appName}" <${process.env.SMTP_FROM}>`,
    to: emailSegreteria,
    subject: `[${appName}] ${titoli[tipoNotifica]}`,
    html,
  });
}
