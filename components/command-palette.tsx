"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Briefcase,
  Database,
  GitBranch,
  Home,
  Moon,
  Package,
  Plus,
  Search,
  Settings,
  Shield,
  Sun,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";

type RecentJob = { id: string; name: string };

export function CommandPalette({
  isAdmin,
  recentJobs,
}: {
  isAdmin: boolean;
  recentJobs: RecentJob[];
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("cmdk:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cmdk:open", onOpen);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start bg-black/40 px-4 pt-[14vh]"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] overflow-hidden rounded-[14px] border border-line bg-surface shadow-2xl"
      >
        <Command label="Palette de commandes">
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
            <Search className="h-4 w-4 text-muted" />
            <Command.Input
              autoFocus
              placeholder="Aller à…, ouvrir un job, basculer le thème…"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-muted-2"
            />
            <kbd className="rounded-[5px] border border-line bg-bg px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="px-3 py-6 text-center text-[13px] text-muted">
              Aucun résultat.
            </Command.Empty>

            <Command.Group heading="Actions" className="cmdk-group">
              <Item onSelect={() => go("/generate")} icon={<Plus />} keywords={["nouvelle", "api"]}>
                Nouvelle API
              </Item>
              <Item
                onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
                icon={theme === "dark" ? <Sun /> : <Moon />}
              >
                Basculer le thème
              </Item>
            </Command.Group>

            <Command.Group heading="Navigation" className="cmdk-group">
              <Item onSelect={() => go("/dashboard")} icon={<Home />}>
                Vue d&apos;ensemble
              </Item>
              <Item onSelect={() => go("/jobs")} icon={<Briefcase />}>
                Jobs
              </Item>
              <Item onSelect={() => go("/apis")} icon={<Package />}>
                APIs
              </Item>
              <Item onSelect={() => go("/deployments")} icon={<GitBranch />}>
                Déploiements
              </Item>
              <Item onSelect={() => go("/databases")} icon={<Database />}>
                Bases de données
              </Item>
              <Item onSelect={() => go("/members")} icon={<Users />}>
                Membres
              </Item>
              <Item onSelect={() => go("/settings")} icon={<Settings />}>
                Paramètres
              </Item>
              {isAdmin && (
                <Item onSelect={() => go("/admin")} icon={<Shield />}>
                  Admin
                </Item>
              )}
            </Command.Group>

            {recentJobs.length > 0 && (
              <Command.Group heading="Jobs récents" className="cmdk-group">
                {recentJobs.map((j) => (
                  <Item
                    key={j.id}
                    onSelect={() => go(`/jobs/${j.id}`)}
                    icon={<Briefcase />}
                    keywords={[j.name]}
                  >
                    {j.name}
                  </Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function Item({
  onSelect,
  icon,
  children,
  keywords,
}: {
  onSelect: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  keywords?: string[];
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      keywords={keywords}
      className="flex cursor-pointer select-none items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13.5px] text-ink-2 outline-none aria-selected:bg-bg-2 aria-selected:text-ink"
    >
      <span className="grid h-4 w-4 place-items-center text-muted [&>svg]:h-[15px] [&>svg]:w-[15px]">
        {icon}
      </span>
      {children}
    </Command.Item>
  );
}
