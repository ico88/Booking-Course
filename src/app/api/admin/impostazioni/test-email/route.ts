import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTransporter } from "@/lib/email";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.ruolo !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await request.json();
  const { host, port, user, pass, fromName } = body as {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    fromName?: string;
  };

  // If password is masked, fetch the real one from DB
  let realPass = pass;
  if (!pass || pass === "••••••••") {
    const row = await prisma.impostazione.findUnique({ where: { chiave: "smtp_password" } });
    realPass = row?.valore ?? "";
  }

  const cfg = {
    host: host || "",
    port: Number(port) || 587,
    user: user || "",
    pass: realPass || "",
    fromName: fromName || "Gestione Corsi",
  };

  if (!cfg.host || !cfg.user) {
    return NextResponse.json({ error: "Host SMTP e utente sono obbligatori" }, { status: 400 });
  }

  const destinatario = session.user.email;
  if (!destinatario) {
    return NextResponse.json({ error: "Email admin non trovata nella sessione" }, { status: 400 });
  }

  try {
    const transport = buildTransporter(cfg);
    await transport.verify();

    const appName = cfg.fromName;
    await transport.sendMail({
      from: `"${appName}" <${cfg.user}>`,
      to: destinatario,
      subject: `[Test SMTP] Configurazione email funzionante`,
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0"
                     style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background:#dc2626;padding:24px 32px;">
                    <h1 style="color:#ffffff;margin:0;font-size:22px;">${appName}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <h2 style="color:#16a34a;margin-top:0;">✅ Configurazione SMTP funzionante!</h2>
                    <p style="color:#475569;line-height:1.6;">
                      Questa è un'email di test per verificare la configurazione SMTP del pannello di amministrazione.
                    </p>
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
                      <p style="margin:0;color:#166534;font-size:14px;">
                        <strong>Server:</strong> ${cfg.host}:${cfg.port}<br>
                        <strong>Mittente:</strong> ${cfg.user}<br>
                        <strong>Destinatario:</strong> ${destinatario}
                      </p>
                    </div>
                    <p style="color:#475569;line-height:1.6;">
                      Se hai ricevuto questa email, la configurazione SMTP è corretta e le notifiche
                      automatiche del sistema funzioneranno correttamente.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
                    <p style="color:#64748b;font-size:12px;margin:0;">
                      Email di test inviata dal pannello amministrativo di ${appName}.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    return NextResponse.json({
      success: true,
      messaggio: `Email di test inviata a ${destinatario}`,
    });
  } catch (err) {
    const error = err as { message?: string; code?: string; response?: string };
    return NextResponse.json(
      {
        error: "Invio fallito",
        dettaglio: error.response || error.message || "Errore sconosciuto",
        codice: error.code,
      },
      { status: 500 }
    );
  }
}
