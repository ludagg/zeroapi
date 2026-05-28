"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  Database,
  GitBranch,
  Home,
  MessageCircle,
  MessagesSquare,
  MoreVertical,
  Search,
  Settings,
  Shield,
  Terminal,
  Users,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarUser = {
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  plan: "FREE" | "STARTER" | "PRO" | "BUSINESS";
  generationsUsed: number;
  generationsLimit: number;
  initials: string;
};

type SidebarProps = {
  user: SidebarUser;
  variant?: "desktop" | "drawer";
  onNavigate?: () => void;
};

export function Sidebar({ user, variant = "desktop", onNavigate }: SidebarProps) {
  const pct = Math.min(
    100,
    Math.round((user.generationsUsed / Math.max(1, user.generationsLimit)) * 100),
  );

  const isDrawer = variant === "drawer";

  return (
    <aside
      className={cn(
        "flex-col overflow-y-auto bg-bg p-3.5",
        isDrawer
          ? "flex h-full pt-14"
          : "hidden border-r border-line lg:flex",
      )}
    >
      <div className="mb-3 flex items-center gap-2.5 border-b border-line px-2 pb-3.5">
        <span className="brand-mark h-[30px] w-[30px] text-[14px]">
          <span>0</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold">
            {user.name ?? user.email.split("@")[0]}
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            <b className="rounded-[3px] bg-accent px-1.5 py-px font-medium text-accent-ink">
              {user.plan}
            </b>
          </div>
        </div>
        <button
          aria-label="Changer de workspace"
          className="grid h-6 w-6 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
        >
          <ChevronsUpDown className="h-3 w-3" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("cmdk:open"))}
        className="mb-3.5 flex h-[34px] items-center gap-2 rounded-[8px] border border-line bg-bg-2 px-2.5 text-[13px] text-muted transition hover:border-line-2"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Rechercher, sauter à…</span>
        <span className="ml-auto rounded-[4px] border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px]">
          ⌘ K
        </span>
      </button>

      <nav className="mb-5 flex flex-col gap-0.5">
        <NavLink href="/dashboard" icon={<Home />} onNavigate={onNavigate}>
          Vue d&apos;ensemble
        </NavLink>
        <NavLink href="/jobs" icon={<Briefcase />} onNavigate={onNavigate}>
          Jobs
        </NavLink>
        <NavLink href="/conversations" icon={<MessagesSquare />} onNavigate={onNavigate}>
          Conversations
        </NavLink>
        <NavLink href="/apis" icon={<Terminal />} onNavigate={onNavigate}>
          Playground
        </NavLink>
        <NavLink href="/deployments" icon={<GitBranch />} onNavigate={onNavigate}>
          Déploiements
        </NavLink>
        <NavLink href="/databases" icon={<Database />} onNavigate={onNavigate}>
          Bases de données
        </NavLink>

        <div className="px-2 pb-1.5 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
          Équipe
        </div>
        <NavLink href="/members" icon={<Users />} onNavigate={onNavigate}>
          Membres
        </NavLink>
        <NavLink href="/discussions" icon={<MessageCircle />} onNavigate={onNavigate}>
          Discussions
        </NavLink>
        <NavLink href="/settings" icon={<Settings />} onNavigate={onNavigate}>
          Paramètres
        </NavLink>

        {user.role === "ADMIN" && (
          <>
            <div className="px-2 pb-1.5 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
              Plateforme
            </div>
            <NavLink href="/admin" icon={<Shield />} onNavigate={onNavigate}>
              Admin
            </NavLink>
          </>
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-line pt-3">
        <div className="rounded-[10px] border border-line bg-bg-2 p-3">
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            <span>Générations</span>
            <span>
              <b className="font-medium text-ink">{user.generationsUsed}</b>/{user.generationsLimit}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-accent transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <Link
            href="/settings"
            onClick={onNavigate}
            className="mt-2.5 inline-block border-b border-accent pb-px text-[12px] font-medium text-ink"
          >
            Passer Business →
          </Link>
        </div>

        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-[9px] p-2 transition hover:bg-bg-2"
        >
          <div className="grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2A6FDB] to-accent font-mono text-[11px] font-semibold text-accent-ink">
            {user.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{user.name ?? "—"}</div>
            <div className="truncate font-mono text-[11px] text-muted">{user.email}</div>
          </div>
          <MoreVertical className="h-3.5 w-3.5 text-muted" />
        </Link>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  children,
  count,
  hasDot,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  count?: number;
  hasDot?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2.5 rounded-[7px] px-2 py-2 text-[14px] transition",
        active
          ? "bg-ink text-bg [&_svg]:text-bg"
          : "text-ink-2 hover:bg-bg-2 hover:text-ink [&_svg]:text-muted hover:[&_svg]:text-ink",
      )}
    >
      <span className="grid h-4 w-4 place-items-center [&>svg]:h-[15px] [&>svg]:w-[15px]">
        {icon}
      </span>
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-px font-mono text-[10px]",
            active ? "bg-white/15 text-bg" : "bg-bg-3 text-muted",
          )}
        >
          {count}
        </span>
      )}
      {hasDot && !count && (
        <span
          className="ml-auto inline-block h-1.5 w-1.5 rounded-full bg-accent"
          style={{ boxShadow: "0 0 0 3px var(--accent-glow)" }}
        />
      )}
    </Link>
  );
}
