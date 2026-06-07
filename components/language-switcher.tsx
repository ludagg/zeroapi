"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { locales, type Locale } from "@/i18n/config";
import { setLocale } from "@/app/actions/locale";

/** Compact FR / EN toggle. Variants:
 *  - "pill"   : segmented control (nav, settings)
 *  - "inline" : icon + current language label (mobile drawer, menus) */
export function LanguageSwitcher({
  variant = "pill",
  className,
}: {
  variant?: "pill" | "inline";
  className?: string;
}) {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === active || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  if (variant === "inline") {
    const next = active === "fr" ? "en" : "fr";
    return (
      <button
        type="button"
        onClick={() => choose(next)}
        disabled={pending}
        aria-label={`Switch language to ${next.toUpperCase()}`}
        className={cn(
          "inline-flex items-center gap-2 text-[13px] font-medium text-ink-2 transition hover:text-ink disabled:opacity-50",
          className,
        )}
      >
        <Globe className="h-4 w-4" />
        <span className="font-mono uppercase">{active}</span>
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-surface p-0.5",
        className,
      )}
    >
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => choose(loc)}
          disabled={pending}
          aria-pressed={loc === active}
          className={cn(
            "rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition disabled:cursor-default",
            loc === active
              ? "bg-ink text-bg"
              : "text-muted hover:text-ink",
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
