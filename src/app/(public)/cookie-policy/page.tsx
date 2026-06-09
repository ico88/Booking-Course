import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COOKIE_POLICY, generaTabellaCoookie } from "@/lib/pagine-legali-defaults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Informativa sull'uso dei cookie ai sensi del Regolamento UE 2016/679.",
};

export default async function PaginaCookiePolicy() {
  const [impostazione, appNameSetting] = await Promise.all([
    prisma.impostazione.findUnique({ where: { chiave: "pagina_cookie_policy" } }).catch(() => null),
    prisma.impostazione.findUnique({ where: { chiave: "app_name" } }).catch(() => null),
  ]);

  const nomeApp = appNameSetting?.valore || "Gestione Corsi";
  const tabella = generaTabellaCoookie(nomeApp);

  const raw = impostazione?.valore || DEFAULT_COOKIE_POLICY;
  const html = raw.replace("{{TABELLA_COOKIE}}", tabella);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
      <p className="text-sm text-gray-500 mb-8">
        Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      <div
        className="space-y-8 text-gray-700 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
