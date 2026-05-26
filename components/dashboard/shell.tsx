"use client";

import { createContext, useContext, useState } from "react";
import { Sidebar, type SidebarUser } from "@/components/dashboard/sidebar";
import { MobileDrawer } from "@/components/ui/mobile-drawer";

type ShellContextValue = {
  openSidebar: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function useDashboardShell() {
  return useContext(ShellContext);
}

export function DashboardShell({
  user,
  children,
}: {
  user: SidebarUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <ShellContext.Provider value={{ openSidebar: () => setOpen(true) }}>
      <Sidebar user={user} variant="desktop" />
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
      <div className="flex h-screen flex-col overflow-hidden bg-bg-2">{children}</div>
    </ShellContext.Provider>
  );
}
