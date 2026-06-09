import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";
import CookieBanner from "@/components/gdpr/CookieBanner";
import { prisma } from "@/lib/prisma";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

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
    <html lang="it" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900 font-sans">
        <Providers>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
