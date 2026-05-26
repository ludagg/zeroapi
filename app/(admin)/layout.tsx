import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Briefcase, Home, KeyRound, Network, ShieldAlert, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/theme-toggle";

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

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-bg-2">
      <aside className="flex flex-col border-r border-line bg-bg p-4">
        <Link href="/" className="mb-5 flex items-center gap-2.5 px-2 font-semibold">
          <span className="brand-mark h-[26px] w-[26px] text-[13px]">
            <span>0</span>
          </span>
          <span>
            Zero<span className="font-medium not-italic text-muted">API</span>
          </span>
          <span className="ml-1 rounded-[5px] bg-danger px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-white">
            admin
          </span>
        </Link>

        <nav className="flex flex-col gap-0.5">
          <AdminLink href="/admin" icon={<Home className="h-4 w-4" />}>
            Vue d&apos;ensemble
          </AdminLink>
          <AdminLink href="/admin/users" icon={<Users className="h-4 w-4" />}>
            Utilisateurs
          </AdminLink>
          <AdminLink href="/admin/jobs" icon={<Briefcase className="h-4 w-4" />}>
            Jobs
          </AdminLink>

          <div className="px-2 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
            Plateforme
          </div>
          <AdminLink
            href="/admin/settings/ai-providers"
            icon={<KeyRound className="h-4 w-4" />}
          >
            AI Providers
          </AdminLink>
          <AdminLink
            href="/admin/settings/llm-routing"
            icon={<Network className="h-4 w-4" />}
          >
            LLM Routing
          </AdminLink>
        </nav>

        <div className="mt-auto border-t border-line pt-3">
          <div className="px-2 text-[12px] text-muted">
            Connecté·e en tant que
            <div className="mt-0.5 font-medium text-ink">{user.name ?? user.email}</div>
          </div>
          <Link
            href="/dashboard"
            className="mt-3 block rounded-[7px] px-2 py-1.5 text-[13px] text-muted transition hover:bg-bg-2 hover:text-ink"
          >
            ← Quitter l&apos;admin
          </Link>
        </div>
      </aside>

      <main className="overflow-y-auto">
        <header className="flex h-[60px] items-center justify-between border-b border-line bg-bg px-6">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-muted">Admin</span>
            <span className="text-muted-2">/</span>
            <span className="font-medium">Console</span>
          </div>
          <ThemeToggle />
        </header>
        <div className="p-7">{children}</div>
      </main>
    </div>
  );
}

function AdminLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-[7px] px-2 py-1.5 text-[13.5px] text-ink-2 transition hover:bg-bg-2 hover:text-ink"
    >
      <span className="text-muted">{icon}</span>
      {children}
    </Link>
  );
}
