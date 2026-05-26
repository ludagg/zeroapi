"use client";

import Link from "next/link";
import { Bell, Menu, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useDashboardShell } from "@/components/dashboard/shell";

type Crumb = { label: string; href?: string };

export function DashboardHeader({
  crumbs,
  unread = 0,
}: {
  crumbs: Crumb[];
  unread?: number;
}) {
  const shell = useDashboardShell();

  return (
    <header className="flex h-[60px] flex-shrink-0 items-center gap-2 border-b border-line bg-bg px-4 sm:gap-3 sm:px-6">
      {shell && (
        <button
          type="button"
          aria-label="Ouvrir le menu"
          onClick={shell.openSidebar}
          className="grid h-[34px] w-[34px] flex-shrink-0 place-items-center rounded-[9px] border border-line bg-surface text-ink-2 transition hover:border-line-2 lg:hidden"
        >
          <Menu className="h-[16px] w-[16px]" />
        </button>
      )}

      <nav
        className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto text-[13px] scrollbar-thin"
        aria-label="Fil d'Ariane"
      >
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={`${c.label}-${i}`} className="flex flex-shrink-0 items-center gap-2">
              {c.href && !isLast ? (
                <Link href={c.href} className="text-muted transition hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span className={isLast ? "truncate font-medium text-ink" : "text-muted"}>
                  {c.label}
                </span>
              )}
              {!isLast && <span className="text-muted-2">/</span>}
            </span>
          );
        })}
      </nav>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          aria-label="Notifications"
          className="relative grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-line bg-surface text-ink-2 transition hover:-translate-y-px hover:border-line-2"
        >
          <Bell className="h-[15px] w-[15px]" />
          {unread > 0 && (
            <span
              className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full bg-accent"
              style={{ boxShadow: "0 0 0 3px var(--bg)" }}
            />
          )}
        </button>
        <ThemeToggle className="hidden sm:grid" />
        <Link
          href="/generate"
          className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-accent px-3 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)] sm:px-3.5"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
          <span className="hidden sm:inline">Nouvelle API</span>
          <span className="sm:hidden">Nouvelle</span>
        </Link>
      </div>
    </header>
  );
}
