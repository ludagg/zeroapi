"use client";

import { createContext, useContext, useState } from "react";
import { useTranslations } from "next-intl";
import { Sidebar, type SidebarUser } from "@/components/dashboard/sidebar";
import { MobileDrawer } from "@/components/ui/mobile-drawer";

type ShellContextValue = {
  openSidebar: () => void;
  collapsed: boolean;
  toggleCollapse: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function useDashboardShell() {
  return useContext(ShellContext);
}

const COLLAPSE_KEY = "zeroapi_nav_collapsed";

export function DashboardShell({
  user,
  initialCollapsed = false,
  children,
}: {
  user: SidebarUser;
  initialCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);
  // The collapsed preference is resolved on the server from a cookie, so the
  // sidebar renders in its final state on the first paint (no post-hydration
  // flip that would reflow the content and re-trigger entry animations).
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      try {
        document.cookie = `${COLLAPSE_KEY}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <ShellContext.Provider value={{ openSidebar: () => setOpen(true), collapsed, toggleCollapse }}>
      <div
        className={
          "grid h-screen grid-cols-1 overflow-hidden bg-bg-2 " +
          (collapsed ? "lg:grid-cols-[64px_minmax(0,1fr)]" : "lg:grid-cols-[248px_minmax(0,1fr)]")
        }
      >
        <Sidebar user={user} variant="desktop" collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-bg-2">{children}</div>
      </div>

      <MobileDrawer
        open={open}
        onClose={() => setOpen(false)}
        side="left"
        width={280}
        label={t("shell.mobileMenuLabel")}
        className="bg-bg"
      >
        <Sidebar user={user} variant="drawer" onNavigate={() => setOpen(false)} />
      </MobileDrawer>
    </ShellContext.Provider>
  );
}
