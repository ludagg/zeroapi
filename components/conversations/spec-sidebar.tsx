"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Check,
  FileJson,
  FileText,
  Gauge,
  GitBranch,
  History,
  Image,
  Key,
  ListTree,
  Lock,
  Redo2,
  Save,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Undo2,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import { formatRelativeTime } from "@/lib/utils";
import { deriveEndpoints } from "@/components/api-detail/endpoints-list";
import type { ApplyOperation } from "@/components/conversations/spec-graph";
import {
  computeInsights,
  confidenceTone,
  type ChatMessage,
  type ConversationInsights,
} from "@/lib/conversation-helpers";

// React Flow is client-only and heavy — load it lazily, only for the Graph tab.
const SpecGraph = dynamic(() => import("@/components/conversations/spec-graph"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-[12px] text-muted">
      Chargement du graphe…
    </div>
  ),
});

type TabKey = "summary" | "spec" | "endpoints" | "graph";

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "summary", label: "Résumé", icon: <Sparkles className="h-3 w-3" /> },
  { key: "spec", label: "Spec", icon: <FileJson className="h-3 w-3" /> },
  { key: "endpoints", label: "Endpoints", icon: <ListTree className="h-3 w-3" /> },
  { key: "graph", label: "Graphe", icon: <Share2 className="h-3 w-3" /> },
];

/**
 * Right panel of the conversation view — now organised in tabs:
 *   • Résumé    — confidence %, security, extras, generate button (existing).
 *   • Spec      — the formatted spec JSON.
 *   • Endpoints — routes derived from the spec, with coloured HTTP methods.
 *   • Graphe    — placeholder ("Bientôt"), built in the next step.
 * The tabs reflect the live `spec` prop, so they update as Kia edits it.
 */
export function SpecPanel({
  conversationId,
  messages,
  spec,
  jobId,
  variant,
  onLaunch,
  pending,
  onApplyOperation,
  historyEntries = [],
  version = -1,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onRestore,
}: {
  conversationId: string;
  messages: ChatMessage[];
  spec: ZeroAPISpec | null;
  jobId: string | null;
  variant: "desktop" | "drawer";
  onLaunch?: () => void;
  pending?: boolean;
  /** When set, the Graph tab becomes an editor (emits operations). */
  onApplyOperation?: ApplyOperation;
  historyEntries?: Array<{ index: number; summary: string; ts: number }>;
  version?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onRestore?: (index: number) => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  // The graph is the hero of this panel — open on it by default.
  const [tab, setTab] = useState<TabKey>("graph");
  const [historyOpen, setHistoryOpen] = useState(false);

  const insights = useMemo(() => computeInsights(messages, spec), [messages, spec]);
  const tone = confidenceTone(insights.confidence);
  const resourceCount = spec?.resources.length ?? 0;
  const canSave = resourceCount > 0 && !submitting && !pending;

  // Promote the live conversation spec to a DRAFT job (no generation yet).
  async function saveJob() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/save-job`, {
        method: "POST",
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "Sauvegarde impossible.");
      }
      toast.success("Job sauvegardé en brouillon.");
      onLaunch?.();
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  const isDrawer = variant === "drawer";

  return (
    <aside
      className={
        isDrawer
          ? "flex h-full flex-col overflow-hidden bg-bg-2 pt-14"
          : "hidden flex-col overflow-hidden border-l border-line bg-bg-2 lg:flex"
      }
    >
      {/* Top bar : petits onglets espacés + confiance + action discrète. */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <div className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                title={t.label}
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition " +
                  (active ? "bg-ink text-bg" : "text-muted hover:bg-bg-3 hover:text-ink-2")
                }
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Undo / Redo / Historique des versions */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Annuler (⌘Z)"
            className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-bg-3 hover:text-ink-2 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Rétablir (⌘⇧Z)"
            className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-bg-3 hover:text-ink-2 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              disabled={historyEntries.length === 0}
              title="Historique des versions"
              className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-bg-3 hover:text-ink-2 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <History className="h-3.5 w-3.5" />
            </button>
            {historyOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setHistoryOpen(false)} aria-hidden />
                <div className="absolute left-0 top-full z-30 mt-1 max-h-[60vh] w-[280px] overflow-y-auto rounded-[10px] border border-line bg-surface shadow-xl scrollbar-thin">
                  <div className="border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    Versions
                  </div>
                  {[...historyEntries].reverse().map((e) => {
                    const active = e.index === version;
                    return (
                      <button
                        key={e.index}
                        type="button"
                        onClick={() => {
                          onRestore?.(e.index);
                          setHistoryOpen(false);
                        }}
                        className={
                          "flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left transition last:border-b-0 hover:bg-bg-2 " +
                          (active ? "bg-accent-soft" : "")
                        }
                      >
                        <span
                          className={
                            "h-1.5 w-1.5 flex-shrink-0 rounded-full " +
                            (active ? "bg-accent" : "bg-line-2")
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] text-ink">{e.summary}</span>
                          <span className="block font-mono text-[10px] text-muted">
                            {formatRelativeTime(new Date(e.ts))}
                            {active ? " · actuel" : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-ink-2 sm:inline-flex">
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (tone === "high" ? "bg-accent" : tone === "med" ? "bg-warn" : "bg-danger")
              }
            />
            {insights.confidence}%
          </span>
          {jobId ? (
            <a
              href={`/jobs/${jobId}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[12px] font-medium text-ink-2 transition hover:border-line-2"
            >
              Voir le job
            </a>
          ) : (
            <button
              type="button"
              onClick={saveJob}
              disabled={!canSave}
              title={canSave ? "Sauvegarder en brouillon" : "Décris au moins une ressource"}
              className={
                "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-medium transition " +
                (canSave
                  ? "bg-accent text-accent-ink hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
                  : "cursor-not-allowed bg-bg-3 text-muted-2")
              }
            >
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{submitting ? "Sauvegarde…" : "Sauvegarder le job"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "graph" ? (
          // Full-bleed: the canvas owns its own scroll/pan, no padding.
          <SpecGraph spec={spec} onApplyOperation={onApplyOperation} />
        ) : (
          <div className="flex-1 overflow-y-auto p-4.5 scrollbar-thin">
            {tab === "summary" && <SummaryTab insights={insights} />}
            {tab === "spec" && <SpecJsonTab spec={spec} />}
            {tab === "endpoints" && <EndpointsTab spec={spec} />}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Résumé tab (the original sidebar body) ───────────────────────────────────

function SummaryTab({ insights }: { insights: ConversationInsights }) {
  const tone = confidenceTone(insights.confidence);
  const detectedModelVisible = insights.confidence >= 70;

  return (
    <div className="space-y-4">
      <ConfidenceCard confidence={insights.confidence} tone={tone} />

      <SpecSection label="Sécurité détectée" count={insights.specReady ? "spec" : "auto"}>
        <AuthBadgeRow features={insights.authFeatures} />
        <SpecRow
          icon={<Shield className="h-3 w-3" />}
          label="RBAC"
          meta={
            insights.roles.length > 0
              ? `${insights.roles.length} rôle${insights.roles.length > 1 ? "s" : ""} · ${insights.roles
                  .slice(0, 3)
                  .join(", ")}`
              : insights.hasPermissions
                ? "Permissions déclaratives"
                : "Pas de rôles"
          }
          enabled={insights.roles.length > 0 || insights.hasPermissions}
        />
        <SpecRow
          icon={<Lock className="h-3 w-3" />}
          label="ownOnly"
          meta={insights.ownOnly ? "Lignes privées par user" : "—"}
          enabled={insights.ownOnly}
        />
        <SpecRow
          icon={<Gauge className="h-3 w-3" />}
          label="Rate limit"
          meta={insights.rateLimit ?? "Non configuré"}
          enabled={Boolean(insights.rateLimit)}
        />
      </SpecSection>

      {insights.relations.length > 0 ? (
        <SpecSection label="Relations" count={`${insights.relations.length}`}>
          {insights.relations.slice(0, 6).map((r, idx) => (
            <SpecRow
              key={`${r.label}-${idx}`}
              icon={<GitBranch className="h-3 w-3" />}
              label={r.label}
              meta={r.kind}
              enabled
            />
          ))}
          {insights.relations.length > 6 && (
            <div className="px-0 pt-1 text-[11px] text-muted">
              + {insights.relations.length - 6} autres…
            </div>
          )}
        </SpecSection>
      ) : null}

      {insights.features.length > 0 ? (
        <SpecSection label="Features" count={`${insights.features.length}`}>
          {insights.features.includes("fileUpload") && (
            <SpecRow icon={<Image className="h-3 w-3" aria-hidden />} label="Upload fichiers" meta="S3 · R2 · local" enabled />
          )}
          {insights.features.includes("webhooks") && (
            <SpecRow icon={<Webhook className="h-3 w-3" />} label="Webhooks" meta="inbound / outbound" enabled />
          )}
          {insights.features.includes("search") && (
            <SpecRow icon={<Search className="h-3 w-3" />} label="Recherche" meta="?q=" enabled />
          )}
          {insights.features.includes("pagination") && (
            <SpecRow icon={<Gauge className="h-3 w-3" />} label="Pagination" meta="cursor + offset" enabled />
          )}
        </SpecSection>
      ) : null}

      <SpecSection label="Extras inclus">
        <SpecRow label="Tests Vitest" meta="✓" enabled />
        <SpecRow label="Docs OpenAPI 3.1" meta="✓" enabled />
        <SpecRow label="Logs structurés" meta="✓" enabled />
      </SpecSection>

      {detectedModelVisible ? (
        <div className="rounded-[12px] border border-accent/40 bg-accent-soft p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-accent-ink">
            <Check className="h-3 w-3" strokeWidth={2.6} />
            Modèle détecté
          </div>
          <div className="mt-2 text-[14px] font-medium text-ink">{insights.summary}</div>
        </div>
      ) : (
        <div className="rounded-[12px] border border-dashed border-line-2 bg-surface p-4 text-center text-[12px] text-muted">
          <FileText className="mx-auto mb-2 h-4 w-4" />
          Continue à décrire ton API à Kia : ressources, authentification, rôles. Le graphe et les
          endpoints se mettent à jour en direct.
        </div>
      )}
    </div>
  );
}

// ── Spec tab (formatted JSON) ────────────────────────────────────────────────

function SpecJsonTab({ spec }: { spec: ZeroAPISpec | null }) {
  if (!spec) {
    return (
      <EmptyState
        icon={<FileJson className="mx-auto mb-2 h-4 w-4" />}
        text="La spec se construit au fil de la discussion avec Kia — elle apparaîtra ici."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      <pre className="overflow-x-auto p-3.5 font-mono text-[11.5px] leading-relaxed text-ink-2 scrollbar-thin">
        {JSON.stringify(spec, null, 2)}
      </pre>
    </div>
  );
}

// ── Endpoints tab (routes derived from the spec) ─────────────────────────────

const METHOD_COLOR: Record<string, string> = {
  GET: "bg-[#E5F0FF] text-[#1554B5]",
  POST: "bg-accent-soft text-accent-ink",
  PUT: "bg-warn-soft text-warn-ink",
  PATCH: "bg-warn-soft text-warn-ink",
  DELETE: "bg-danger-soft text-danger",
};

function EndpointsTab({ spec }: { spec: ZeroAPISpec | null }) {
  const endpoints = useMemo(
    () => (spec ? deriveEndpoints(spec.resources) : []),
    [spec],
  );
  if (!spec) {
    return (
      <EmptyState
        icon={<ListTree className="mx-auto mb-2 h-4 w-4" />}
        text="Décris des ressources à Kia — les routes apparaîtront ici en direct."
      />
    );
  }
  if (endpoints.length === 0) {
    return <EmptyState icon={<ListTree className="mx-auto mb-2 h-4 w-4" />} text="Aucun endpoint dérivé de la spec." />;
  }
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      {endpoints.map((e, i) => (
        <div
          key={`${e.method}-${e.path}-${i}`}
          className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2.5 px-3 py-2.5"
          style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
        >
          <span
            className={
              "inline-flex justify-center rounded-[5px] px-1 py-0.5 font-mono text-[10px] font-semibold tracking-[0.03em] " +
              (METHOD_COLOR[e.method] ?? "bg-bg-2 text-ink-2")
            }
          >
            {e.method}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-mono text-[12px] text-ink">{e.path}</span>
              {e.auth && <Lock className="h-2.5 w-2.5 flex-shrink-0 text-muted" />}
            </div>
            {e.description && (
              <div className="mt-0.5 truncate text-[11px] text-muted">{e.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-[12px] border border-dashed border-line-2 bg-surface p-6 text-center text-[12px] text-muted">
      {icon}
      {text}
    </div>
  );
}

// ── Shared bits (unchanged) ──────────────────────────────────────────────────

function ConfidenceCard({
  confidence,
  tone,
}: {
  confidence: number;
  tone: "high" | "med" | "low";
}) {
  const barColor = tone === "high" ? "bg-accent" : tone === "med" ? "bg-warn" : "bg-danger";
  const message =
    tone === "high"
      ? "Spec quasi complète, tu peux lancer."
      : tone === "med"
        ? "Bon début. Précise auth, rôles et ressources."
        : "Trop tôt — décris les ressources principales.";

  return (
    <div className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Confiance</span>
        <span className="font-serif text-[22px] leading-none">{confidence}%</span>
      </div>
      <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-bg-3">
        <div
          className={`h-full ${barColor} transition-[width] duration-700`}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <p className="mt-2.5 text-[12px] leading-snug text-muted">{message}</p>
    </div>
  );
}

function SpecSection({
  label,
  count,
  children,
}: {
  label: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{label}</span>
        {count && (
          <span className="rounded-full bg-bg-2 px-1.5 py-px font-mono text-[10.5px] text-ink-2">{count}</span>
        )}
      </div>
      <div className="px-3.5 py-2.5">{children}</div>
    </div>
  );
}

function AuthBadgeRow({ features }: { features: ConversationInsights["authFeatures"] }) {
  const enabled = features.length > 0;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-dashed border-line py-1.5 font-mono text-[12px] text-ink-2 last:border-b-0">
      <span className="flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3" />
        Auth
      </span>
      <span className="flex flex-wrap items-center justify-end gap-1">
        {enabled ? (
          features.map((f) => <AuthBadge key={f} feature={f} />)
        ) : (
          <span className="text-[10.5px] text-muted">Aucune</span>
        )}
      </span>
    </div>
  );
}

function AuthBadge({ feature }: { feature: ConversationInsights["authFeatures"][number] }) {
  const icon =
    feature === "API Key" ? (
      <Key className="h-2.5 w-2.5" strokeWidth={2.6} />
    ) : feature === "OAuth" ? (
      <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.6} />
    ) : (
      <Lock className="h-2.5 w-2.5" strokeWidth={2.6} />
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-1.5 py-px text-[10px] text-accent-ink">
      {icon}
      {feature}
    </span>
  );
}

function SpecRow({
  icon,
  label,
  meta,
  enabled,
}: {
  icon?: React.ReactNode;
  label: string;
  meta: string;
  enabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-dashed border-line py-1.5 font-mono text-[12px] text-ink-2 last:border-b-0">
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={"text-[10.5px] " + (enabled ? "text-accent-ink" : "text-muted")}>{meta}</span>
    </div>
  );
}
