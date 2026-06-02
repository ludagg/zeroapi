"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, Loader2, Sparkles, Store, Users } from "lucide-react";
import { toast } from "sonner";
import type { TemplateCard } from "@/lib/marketplace";

type Source = "all" | "official" | "community";

export function MarketplaceBrowser({
  official,
  community,
  categories,
}: {
  official: TemplateCard[];
  community: TemplateCard[];
  categories: string[];
}) {
  const router = useRouter();
  const [source, setSource] = useState<Source>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);

  // The pool reacts to the Officiel / Communauté filter, then to the category.
  const pool = useMemo(() => {
    const base =
      source === "official" ? official : source === "community" ? community : [...official, ...community];
    return category ? base.filter((t) => t.category === category) : base;
  }, [source, category, official, community]);

  // Keep official + community visually grouped when showing "Tous".
  const officialShown = pool.filter((t) => t.isOfficial);
  const communityShown = pool.filter((t) => !t.isOfficial);

  async function useTemplate(id: string) {
    if (usingId) return;
    setUsingId(id);
    try {
      const res = await fetch(`/api/marketplace/${id}/use`, { method: "POST" });
      const data = (await res.json()) as { conversationId?: string; error?: string };
      if (!res.ok || !data.conversationId) {
        throw new Error(data.error ?? "Impossible d'utiliser ce template.");
      }
      router.push(`/conversations/${data.conversationId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
      setUsingId(null);
    }
  }

  return (
    <div>
      {/* Filters: source (Tous / Officiel / Communauté) + categories. */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceChip active={source === "all"} onClick={() => setSource("all")} icon={<Store className="h-3.5 w-3.5" />}>
            Tous
          </SourceChip>
          <SourceChip
            active={source === "official"}
            onClick={() => setSource("official")}
            icon={<BadgeCheck className="h-3.5 w-3.5" />}
          >
            Officiel
          </SourceChip>
          <SourceChip
            active={source === "community"}
            onClick={() => setSource("community")}
            icon={<Users className="h-3.5 w-3.5" />}
          >
            Communauté
          </SourceChip>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <CatChip active={category === null} onClick={() => setCategory(null)}>
              Toutes catégories
            </CatChip>
            {categories.map((c) => (
              <CatChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </CatChip>
            ))}
          </div>
        )}
      </div>

      {pool.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {officialShown.length > 0 && (
            <Section
              title="Officiel ZeroAPI"
              subtitle="Maintenus par l'équipe — prêts à déployer."
              icon={<BadgeCheck className="h-4 w-4 text-accent-ink" />}
            >
              {officialShown.map((t) => (
                <Card key={t.id} t={t} using={usingId === t.id} disabled={usingId !== null} onUse={() => useTemplate(t.id)} />
              ))}
            </Section>
          )}

          {communityShown.length > 0 && (
            <Section
              title="Communauté"
              subtitle="Publiés par des membres — les plus utilisés en premier."
              icon={<Users className="h-4 w-4 text-ink-2" />}
            >
              {communityShown.map((t) => (
                <Card key={t.id} t={t} using={usingId === t.id} disabled={usingId !== null} onUse={() => useTemplate(t.id)} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="font-serif text-[20px] leading-none">{title}</h2>
        <span className="text-[12.5px] text-muted">— {subtitle}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function Card({
  t,
  using,
  disabled,
  onUse,
}: {
  t: TemplateCard;
  using: boolean;
  disabled: boolean;
  onUse: () => void;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface p-4 transition hover:-translate-y-px hover:border-line-2 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[10px] bg-bg-2 text-[20px] leading-none">
          {t.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold text-ink">{t.title}</h3>
          </div>
          <span className="mt-0.5 inline-block rounded-full bg-bg-2 px-2 py-px font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
            {t.category}
          </span>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-[13px] leading-snug text-muted">{t.description}</p>

      <div className="mt-3.5 flex items-center justify-between gap-2">
        {t.isOfficial ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink">
            <BadgeCheck className="h-3 w-3" />
            Officiel ZeroAPI
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 truncate rounded-full border border-line bg-bg-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
            <Users className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{t.authorName}</span>
          </span>
        )}
        <span className="flex-shrink-0 font-mono text-[11px] text-muted-2">
          {t.usageCount} util.
        </span>
      </div>

      <button
        type="button"
        onClick={onUse}
        disabled={disabled}
        className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {using ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Préparation…
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Utiliser ce template
            <ArrowRight className="h-3.5 w-3.5" />
          </>
        )}
      </button>
    </div>
  );
}

function SourceChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-medium transition " +
        (active ? "bg-ink text-bg" : "border border-line bg-surface text-ink-2 hover:border-line-2")
      }
    >
      {icon}
      {children}
    </button>
  );
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex h-7 items-center rounded-full px-2.5 text-[12px] font-medium transition " +
        (active
          ? "bg-accent-soft text-accent-ink ring-1 ring-accent/40"
          : "border border-line bg-surface text-muted hover:text-ink-2")
      }
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[14px] border border-dashed border-line-2 bg-surface px-6 py-12 text-center">
      <Store className="mx-auto mb-3 h-5 w-5 text-muted-2" />
      <p className="font-serif text-[22px] leading-tight">
        Aucun template <em className="italic">ici</em>.
      </p>
      <p className="mt-2 text-[13.5px] text-muted">
        Change de filtre, ou publie le tien depuis un job (visibilité PUBLIC).
      </p>
    </div>
  );
}
