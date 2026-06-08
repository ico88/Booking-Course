import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/login");

  if (!["SEGRETERIA", "ADMIN"].includes(session.user.ruolo)) redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{session.user.name}</span>
            <span className="text-gray-300">|</span>
            <a
              href="/api/auth/signout"
              className="text-red-500 hover:text-red-700"
            >
              Esci
            </a>
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
