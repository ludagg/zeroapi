"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Briefcase,
  GitBranch,
  Home,
  Moon,
  Plus,
  Search,
  Settings,
  Shield,
  Sun,
  Terminal,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

type RecentJob = { id: string; name: string };

export function CommandPalette({
  isAdmin,
  recentJobs,
}: {
  isAdmin: boolean;
  recentJobs: RecentJob[];
}) {
  const t = useTranslations("dashboard");
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
        <Command label={t("commandPalette.label")}>
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
            <Search className="h-4 w-4 text-muted" />
            <Command.Input
              autoFocus
              placeholder={t("commandPalette.placeholder")}
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-muted-2"
            />
            <kbd className="rounded-[5px] border border-line bg-bg px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="px-3 py-6 text-center text-[13px] text-muted">
              {t("commandPalette.noResults")}
            </Command.Empty>

            <Command.Group heading={t("commandPalette.groupActions")} className="cmdk-group">
              <Item onSelect={() => go("/conversations")} icon={<Plus />} keywords={["nouvelle", "api", "new"]}>
                {t("commandPalette.newApi")}
              </Item>
              <Item
                onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
                icon={theme === "dark" ? <Sun /> : <Moon />}
              >
                {t("commandPalette.toggleTheme")}
              </Item>
            </Command.Group>

            <Command.Group heading={t("commandPalette.groupNavigation")} className="cmdk-group">
              <Item onSelect={() => go("/dashboard")} icon={<Home />}>
                {t("commandPalette.overview")}
              </Item>
              <Item onSelect={() => go("/jobs")} icon={<Briefcase />}>
                {t("commandPalette.jobs")}
              </Item>
              <Item onSelect={() => go("/apis")} icon={<Terminal />}>
                {t("commandPalette.playground")}
              </Item>
              <Item onSelect={() => go("/deployments")} icon={<GitBranch />}>
                {t("commandPalette.deployments")}
              </Item>
              <Item onSelect={() => go("/members")} icon={<Users />}>
                {t("commandPalette.members")}
              </Item>
              <Item onSelect={() => go("/settings")} icon={<Settings />}>
                {t("commandPalette.settings")}
              </Item>
              {isAdmin && (
                <Item onSelect={() => go("/admin")} icon={<Shield />}>
                  {t("commandPalette.admin")}
                </Item>
              )}
            </Command.Group>

            {recentJobs.length > 0 && (
              <Command.Group heading={t("commandPalette.groupRecentJobs")} className="cmdk-group">
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
