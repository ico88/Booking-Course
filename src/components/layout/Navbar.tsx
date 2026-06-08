"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  User,
  Shield,
} from "lucide-react";

export default function Navbar({ logoUrl }: { logoUrl?: string | null } = {}) {
  const { data: session } = useSession();
  const [menuAperto, setMenuAperto] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-blue-700 text-lg hover:text-blue-800 transition-colors"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 w-auto max-w-[160px] object-contain" />
            ) : (
              <>
                <BookOpen className="h-6 w-6" />
                <span>Gestione Corsi</span>
              </>
            )}
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Corsi
            </Link>

            {session ? (
              <>
                {session.user.ruolo === "SEGRETERIA" ? (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Back Office
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    La mia area
                  </Link>
                )}

                <div className="flex items-center gap-2 pl-3 border-l border-gray-200 ml-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700 font-medium">
                      {session.user.name}
                    </span>
                  </div>
                  {session.user.ruolo === "UTENTE" && (
                    <Link
                      href="/dashboard/dati-personali"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      title="Privacy e dati personali"
                    >
                      <Shield className="h-4 w-4" />
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Esci
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 pl-3 border-l border-gray-200 ml-1">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                >
                  Accedi
                </Link>
                <Link
                  href="/auth/registrazione"
                  className="px-4 py-2 rounded-lg text-sm bg-blue-700 text-white hover:bg-blue-800 transition-colors font-medium"
                >
                  Registrati
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuAperto(!menuAperto)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            {menuAperto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuAperto && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            <Link
              href="/"
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setMenuAperto(false)}
            >
              Corsi
            </Link>
            {session ? (
              <>
                {session.user.ruolo === "SEGRETERIA" ? (
                  <Link
                    href="/admin"
                    className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setMenuAperto(false)}
                  >
                    Back Office
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setMenuAperto(false)}
                  >
                    La mia area
                  </Link>
                )}
                {session.user.ruolo === "UTENTE" && (
                  <Link
                    href="/dashboard/dati-personali"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setMenuAperto(false)}
                  >
                    <Shield className="h-4 w-4" />
                    Privacy e dati personali
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                >
                  Esci ({session.user.name})
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setMenuAperto(false)}
                >
                  Accedi
                </Link>
                <Link
                  href="/auth/registrazione"
                  className="block px-3 py-2 rounded-lg text-sm text-blue-700 font-medium hover:bg-blue-50"
                  onClick={() => setMenuAperto(false)}
                >
                  Registrati
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
