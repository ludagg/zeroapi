"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

const COLLAPSE_KEY = "zeroapi:nav-collapsed";

export function DashboardShell({
  user,
  children,
}: {
  user: SidebarUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore the collapsed preference for the session (client-only to avoid a
  // hydration mismatch).
  useEffect(() => {
    try {
      setCollapsed(sessionStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      try {
        sessionStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
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
        label="Menu de navigation"
        className="bg-bg"
      >
        <Sidebar user={user} variant="drawer" onNavigate={() => setOpen(false)} />
      </MobileDrawer>
    </ShellContext.Provider>
  );
}
