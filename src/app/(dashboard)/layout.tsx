import Navbar from "@/components/layout/Navbar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const logoSetting = await prisma.impostazione.findUnique({ where: { chiave: "logo_url" } }).catch(() => null);

  return (
    <>
      <Navbar logoUrl={logoSetting?.valore} />
      <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
    </>
  );
}
