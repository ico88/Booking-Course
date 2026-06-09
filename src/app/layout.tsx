import type { Metadata } from "next";
import "./globals.css";
import Providers from "./Providers";
import CookieBanner from "@/components/gdpr/CookieBanner";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  const appNameSetting = await prisma.impostazione
    .findUnique({ where: { chiave: "app_name" } })
    .catch(() => null);

  const titolo = appNameSetting?.valore || "Gestione Corsi";

  return {
    title: titolo,
    description: "Piattaforma per la gestione e prenotazione di corsi formativi",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full bg-gray-50 text-gray-900 font-sans">
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
