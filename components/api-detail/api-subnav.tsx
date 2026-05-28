"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ApiSubnav({ id }: { id: string }) {
  const pathname = usePathname() ?? "";
  const tabs = [
    { id: "overview", label: "Aperçu", href: `/apis/${id}` },
    { id: "settings", label: "Variables", href: `/apis/${id}/settings` },
  ];

  return (
    <nav role="tablist" className="mb-5 flex gap-1 border-b border-line">
      {tabs.map((t) => {
        const isOn =
          t.id === "settings"
            ? pathname.endsWith("/settings")
            : !pathname.endsWith("/settings");
        return (
          <Link
            key={t.id}
            role="tab"
            aria-selected={isOn}
            href={t.href}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3 py-2.5 text-[13.5px] transition",
              isOn ? "font-medium text-ink" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
            {isOn && (
              <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-ink" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
