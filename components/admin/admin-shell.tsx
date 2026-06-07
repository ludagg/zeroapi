"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";
import Link from "next/link";
import { Activity, Briefcase, Home, KeyRound, Menu, Network, Send, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileDrawer } from "@/components/ui/mobile-drawer";

type AdminUser = { name: string | null; email: string };

export function AdminShell({
  user,
  children,
}: {
  user: AdminUser;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("admin");

  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg-2 lg:grid-cols-[240px_1fr]">
      <AdminSidebar user={user} variant="desktop" />

      <MobileDrawer
        open={open}
        onClose={() => setOpen(false)}
        side="left"
        width={280}
        label={t("nav.openMenuAdmin")}
        className="bg-bg"
      >
        <AdminSidebar
          user={user}
          variant="drawer"
          onNavigate={() => setOpen(false)}
        />
      </MobileDrawer>

      <main className="overflow-y-auto">
        <header className="flex h-[60px] items-center justify-between gap-2 border-b border-line bg-bg px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={t("nav.openMenu")}
              onClick={() => setOpen(true)}
              className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] border border-line bg-surface text-ink-2 transition hover:border-line-2 lg:hidden"
            >
              <Menu className="h-[16px] w-[16px]" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-[13px]">
              <span className="text-muted">Admin</span>
              <span className="text-muted-2">/</span>
              <span className="truncate font-medium">{t("nav.consoleBreadcrumb")}</span>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <div className="p-5 sm:p-7">{children}</div>
      </main>
    </div>
  );
}

function AdminSidebar({
  user,
  variant,
  onNavigate,
}: {
  user: AdminUser;
  variant: "desktop" | "drawer";
  onNavigate?: () => void;
}) {
  const isDrawer = variant === "drawer";
  const t = useTranslations("admin");

  return (
    <aside
      className={
        isDrawer
          ? "flex h-full flex-col bg-bg p-4 pt-14"
          : "hidden border-r border-line bg-bg p-4 lg:flex lg:flex-col"
      }
    >
      <Link
        href="/"
        onClick={onNavigate}
        className="mb-5 flex items-center gap-2.5 px-2 font-semibold"
      >
        <BrandMark size={26} />
        <span>
          Zero<span className="font-medium not-italic text-muted">API</span>
        </span>
        <span className="ml-1 rounded-[5px] bg-danger px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-white">
          admin
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        <AdminLink href="/admin" icon={<Home className="h-4 w-4" />} onNavigate={onNavigate}>
          {t("nav.overview")}
        </AdminLink>
        <AdminLink
          href="/admin/users"
          icon={<Users className="h-4 w-4" />}
          onNavigate={onNavigate}
        >
          {t("nav.users")}
        </AdminLink>
        <AdminLink
          href="/admin/jobs"
          icon={<Briefcase className="h-4 w-4" />}
          onNavigate={onNavigate}
        >
          {t("nav.jobs")}
        </AdminLink>

        <div className="px-2 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
          {t("nav.monitoring")}
        </div>
        <AdminLink
          href="/admin/security"
          icon={<Activity className="h-4 w-4" />}
          onNavigate={onNavigate}
        >
          {t("nav.security")}
        </AdminLink>

        <div className="px-2 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
          {t("nav.platform")}
        </div>
        <AdminLink
          href="/admin/settings/ai-providers"
          icon={<KeyRound className="h-4 w-4" />}
          onNavigate={onNavigate}
        >
          {t("nav.aiProviders")}
        </AdminLink>
        <AdminLink
          href="/admin/settings/llm-routing"
          icon={<Network className="h-4 w-4" />}
          onNavigate={onNavigate}
        >
          {t("nav.llmRouting")}
        </AdminLink>
        <AdminLink
          href="/admin/settings/telegram"
          icon={<Send className="h-4 w-4" />}
          onNavigate={onNavigate}
        >
          {t("nav.telegram")}
        </AdminLink>
      </nav>

      <div className="mt-auto border-t border-line pt-3">
        <div className="px-2 text-[12px] text-muted">
          {t("nav.loggedInAs")}
          <div className="mt-0.5 font-medium text-ink">{user.name ?? user.email}</div>
        </div>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="mt-3 block rounded-[7px] px-2 py-1.5 text-[13px] text-muted transition hover:bg-bg-2 hover:text-ink"
        >
          {t("nav.leaveAdmin")}
        </Link>
      </div>
    </aside>
  );
}

function AdminLink({
  href,
  icon,
  children,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-[7px] px-2 py-2 text-[14px] text-ink-2 transition hover:bg-bg-2 hover:text-ink"
    >
      <span className="text-muted">{icon}</span>
      {children}
    </Link>
  );
}
