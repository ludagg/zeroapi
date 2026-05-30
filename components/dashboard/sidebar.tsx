"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Sparkles,
  Database,
  Settings,
  Webhook,
  Shield,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export type SidebarUser = {
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  plan: string;
  generationsUsed: number;
  generationsLimit: number;
  initials: string;
};

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string };

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Boxes },
  { href: "/conversations", label: "Conversations", icon: Sparkles },
  { href: "/databases", label: "Bases de données", icon: Database },
  { href: "/playground", label: "Playground", icon: Webhook },
];

const ACCOUNT_NAV: NavItem[] = [
  { href: "/settings", label: "Paramètres", icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Admin", icon: Shield },
];

export function Sidebar({
  user,
  variant,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: {
  user: SidebarUser;
  variant: "desktop" | "drawer";
  onNavigate?: () => void;
  /** Desktop only: render the narrow icon-rail. */
  collapsed?: boolean;
  /** Desktop only: show the collapse/expand toggle. */
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  // Collapsed rail only applies on the desktop variant (the drawer is full-width).
  const rail = variant === "desktop" && collapsed;

  return (
    <aside
      className={
        variant === "desktop"
          ? "hidden h-screen flex-col border-r border-line bg-bg lg:flex"
          : "flex h-full flex-col bg-bg"
      }
    >
      <div
        className={
          "flex h-[60px] flex-shrink-0 items-center border-b border-line " +
          (rail ? "justify-center px-2" : "gap-2.5 px-5")
        }
      >
        <div className="brand-mark h-7 w-7 flex-shrink-0 text-[13px]">
          <span>0</span>
        </div>
        {!rail && <span className="text-[15px] font-semibold tracking-tight">ZeroAPI</span>}
        {variant === "desktop" && onToggleCollapse && !rail && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Réduire la navigation"
            title="Réduire la navigation"
            className="ml-auto grid h-7 w-7 place-items-center rounded-[8px] text-muted transition hover:bg-surface hover:text-ink"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {rail && onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Déplier la navigation"
          title="Déplier la navigation"
          className="mx-auto mt-2 grid h-8 w-8 place-items-center rounded-[8px] text-muted transition hover:bg-surface hover:text-ink"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <nav className={"flex-1 space-y-0.5 overflow-y-auto scrollbar-thin " + (rail ? "p-2" : "p-3")}>
        <NavSection items={MAIN_NAV} isActive={isActive} onNavigate={onNavigate} rail={rail} />
        <div className="my-2 border-t border-line" />
        <NavSection items={ACCOUNT_NAV} isActive={isActive} onNavigate={onNavigate} rail={rail} />
        {user.role === "ADMIN" && (
          <>
            <div className="my-2 border-t border-line" />
            <NavSection items={ADMIN_NAV} isActive={isActive} onNavigate={onNavigate} rail={rail} />
          </>
        )}
      </nav>

      {rail ? (
        <div className="flex flex-shrink-0 flex-col items-center gap-2 border-t border-line p-2">
          <div
            title={user.name ?? user.email}
            className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-accent to-[#7CFFB2] font-mono text-[12px] font-semibold text-bg"
          >
            {user.initials}
          </div>
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.push("/login");
            }}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="grid h-8 w-8 place-items-center rounded-[8px] text-muted transition hover:bg-bg-3 hover:text-ink"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex-shrink-0 border-t border-line p-3">
          <div className="mb-2 rounded-[10px] border border-line bg-surface p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                Plan {user.plan}
              </span>
              <Link
                href="/settings"
                onClick={onNavigate}
                className="text-[11px] text-accent-ink hover:underline"
              >
                Gérer
              </Link>
            </div>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[13px] font-medium">{user.generationsUsed} générations</span>
              <span className="text-[11px] text-muted">/ {user.generationsLimit}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-3">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${Math.min(100, (user.generationsUsed / user.generationsLimit) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[10px] p-2 transition hover:bg-surface">
            <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-[#7CFFB2] font-mono text-[12px] font-semibold text-bg">
              {user.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium">{user.name ?? "Utilisateur"}</div>
              <div className="truncate text-[11px] text-muted">{user.email}</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await authClient.signOut();
                router.push("/login");
              }}
              aria-label="Se déconnecter"
              className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] text-muted transition hover:bg-bg-3 hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function NavSection({
  items,
  isActive,
  onNavigate,
  rail,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
  rail: boolean;
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={rail ? item.label : undefined}
            className={
              "group flex items-center rounded-[10px] text-[13.5px] transition " +
              (rail ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2") +
              " " +
              (active
                ? "bg-surface font-medium text-ink"
                : "text-muted hover:bg-surface hover:text-ink")
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {!rail && <span>{item.label}</span>}
          </Link>
        );
      })}
    </>
  );
}

export default Sidebar;
