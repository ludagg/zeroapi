import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) notFound();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true, email: true },
  });

  if (!user || user.role !== "ADMIN") {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-[14px] border border-line bg-danger-soft text-danger">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-[40px] leading-none tracking-[-0.01em]">
            403 — <em className="italic">accès refusé</em>.
          </h1>
          <p className="mt-3 text-muted">
            Cette zone est réservée aux administrateurs ZeroAPI.
          </p>
          <Link href="/dashboard" className="btn-primary mt-6">
            Retour au dashboard
          </Link>
        </div>
      </main>
    );
  }

  return <AdminShell user={{ name: user.name, email: user.email }}>{children}</AdminShell>;
}
