"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  PlusCircle,
  GraduationCap,
  Settings,
} from "lucide-react";

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
    ruolo: ["SEGRETERIA", "ADMIN"],
  },
  {
    href: "/admin/corsi",
    label: "Corsi",
    icon: BookOpen,
    ruolo: ["SEGRETERIA", "ADMIN"],
  },
  {
    href: "/admin/corsi/nuovo",
    label: "Nuovo corso",
    icon: PlusCircle,
    ruolo: ["SEGRETERIA", "ADMIN"],
  },
  {
    href: "/admin/prenotazioni",
    label: "Prenotazioni",
    icon: ClipboardList,
    ruolo: ["SEGRETERIA", "ADMIN"],
  },
  {
    href: "/admin/attestati",
    label: "Attestati",
    icon: GraduationCap,
    ruolo: ["SEGRETERIA", "ADMIN"],
  },
  {
    href: "/admin/utenti",
    label: "Utenti",
    icon: Users,
    ruolo: ["SEGRETERIA", "ADMIN"],
  },
  {
    href: "/admin/impostazioni",
    label: "Impostazioni",
    icon: Settings,
    ruolo: ["ADMIN"],
  },
];

export default function AdminSidebar({ logoUrl }: { logoUrl?: string | null } = {}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-64 bg-gray-900 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <Link href="/admin" className="flex items-center gap-2 text-white font-bold">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-7 w-auto max-w-[140px] object-contain brightness-0 invert" />
          ) : (
            <>
              <BookOpen className="h-5 w-5 text-blue-400" />
              <span>Back Office</span>
            </>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.filter((item) =>
          session?.user?.ruolo
            ? item.ruolo.includes(session.user.ruolo)
            : false
        ).map((item) => {
          const attivo = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                attivo
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Vai al sito pubblico →
        </Link>
      </div>
    </aside>
  );
}
