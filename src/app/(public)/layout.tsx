import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoSetting = await prisma.impostazione.findUnique({ where: { chiave: "logo_url" } }).catch(() => null);

  return (
    <>
      <Navbar logoUrl={logoSetting?.valore} />
      <main className="flex-1">{children}</main>
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <span>© {new Date().getFullYear()} Gestione Corsi. Tutti i diritti riservati.</span>
            <nav className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <Link href="/privacy-policy" className="hover:text-gray-800 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/cookie-policy" className="hover:text-gray-800 transition-colors">
                Cookie Policy
              </Link>
              <Link href="/termini-condizioni" className="hover:text-gray-800 transition-colors">
                Termini e Condizioni
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
