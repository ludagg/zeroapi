"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Check,
  FileJson,
  FileText,
  Gauge,
  GitBranch,
  Globe,
  History,
  Image,
  Key,
  ListTree,
  Loader2,
  Lock,
  Redo2,
  RefreshCw,
  Rocket,
  Save,
  Wrench,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Undo2,
  Webhook,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import type { TemplateVisibility } from "@prisma/client";
import { TEMPLATE_CATEGORIES } from "@/lib/template-categories";
import { formatRelativeTime } from "@/lib/utils";
import { deriveEndpoints } from "@/components/api-detail/endpoints-list";
import { DevTab } from "@/components/conversations/dev-tab";
import type { ApplyOperation } from "@/components/conversations/spec-graph";
import {
  computeInsights,
  confidenceTone,
  type ChatMessage,
  type ConversationInsights,
} from "@/lib/conversation-helpers";
import { auditSpec, auditScore, type AuditFinding, type AuditSeverity } from "@/lib/spec-audit";

// React Flow is client-only and heavy — load it lazily, only for the Graph tab.
const SpecGraph = dynamic(() => import("@/components/conversations/spec-graph"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-[12px] text-muted">
      Chargement du graphe…
    </div>
  ),
});

type TabKey = "summary" | "spec" | "endpoints" | "graph" | "dev";

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "summary", label: "Audit", icon: <Gauge className="h-3 w-3" /> },
  { key: "spec", label: "Spec", icon: <FileJson className="h-3 w-3" /> },
  { key: "endpoints", label: "Endpoints", icon: <ListTree className="h-3 w-3" /> },
  { key: "graph", label: "Graphe", icon: <Share2 className="h-3 w-3" /> },
  { key: "dev", label: "Dev", icon: <Terminal className="h-3 w-3" /> },
];

/**
 * Order-insensitive structural equality for two specs. Keys are sorted before
 * stringifying so a re-serialised spec (e.g. from the DB) compares equal to the
 * live one when nothing actually changed.
 */
function specsEqual(a: ZeroAPISpec, b: ZeroAPISpec): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
}

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
  savedSpec = null,
  hasActiveDeployment = false,
  deploymentStale = false,
  onJobUpdated,
  jobVisibility = null,
  onVisibilityChange,
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
  /** The spec as it was at the job's last save (null when no job yet). */
  savedSpec?: ZeroAPISpec | null;
  /** Whether the linked job currently has a live deployment. */
  hasActiveDeployment?: boolean;
  /** True after updating a job whose deployment is now out of date. */
  deploymentStale?: boolean;
  /** Called after a successful "Mettre à jour le job". */
  onJobUpdated?: (updated: ZeroAPISpec, staleDeployment: boolean) => void;
  /** Current marketplace visibility of the linked job (null when no job yet). */
  jobVisibility?: TemplateVisibility | null;
  /** Called after the visibility is persisted (publish / retire). */
  onVisibilityChange?: (visibility: TemplateVisibility) => void;
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
  const [updating, setUpdating] = useState(false);
  // The graph is the hero of this panel — open on it by default.
  const [tab, setTab] = useState<TabKey>("graph");
  const [historyOpen, setHistoryOpen] = useState(false);

  // Marketplace visibility (Phase 2). PRIVATE by default; PUBLIC publishes the
  // job's spec as a community template.
  const [visibility, setVisibility] = useState<TemplateVisibility>(jobVisibility ?? "PRIVATE");
  const [publishOpen, setPublishOpen] = useState(false);
  const [busyVisibility, setBusyVisibility] = useState(false);
  const [pubTitle, setPubTitle] = useState("");
  const [pubDesc, setPubDesc] = useState("");
  const [pubCategory, setPubCategory] = useState<string>("Autre");

  const findings = useMemo(() => auditSpec(spec), [spec]);
  const score = useMemo(() => auditScore(findings), [findings]);
  const tone = confidenceTone(score);
  const resourceCount = spec?.resources.length ?? 0;
  const canSave = resourceCount > 0 && !submitting && !pending;

  // The live spec drifts from the saved job whenever Kia edits it post-save.
  // When that happens, "Sauvegarder" becomes "Mettre à jour" (a new version).
  const specChanged = useMemo(
    () => Boolean(jobId && savedSpec && spec && !specsEqual(spec, savedSpec)),
    [jobId, savedSpec, spec],
  );
  const canUpdate = specChanged && !updating && !pending;

  type PublishFields = { title: string; description: string; category: string };

  // Promote the live conversation spec to a DRAFT job (no generation yet).
  // `vis`/`template` carry the marketplace choice (Phase 2).
  async function saveJob(vis: TemplateVisibility = "PRIVATE", template?: PublishFields) {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/save-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: vis, template }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "Sauvegarde impossible.");
      }
      toast.success(vis === "PUBLIC" ? "Job sauvegardé et publié." : "Job sauvegardé en brouillon.");
      onLaunch?.();
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
      setSubmitting(false);
    }
  }

  // Push the current spec onto the existing job as a new version (no re-deploy).
  async function updateJob() {
    if (!canUpdate || !spec) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/save-job`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { hasActiveDeployment?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Mise à jour impossible.");
      }
      toast.success("Job mis à jour.");
      onJobUpdated?.(spec, Boolean(data.hasActiveDeployment));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setUpdating(false);
    }
  }

  // ── Marketplace visibility (Phase 2) ───────────────────────────────────────

  // Pick a visibility from the segmented control: PUBLIC always asks for the
  // listing fields first (modal); PRIVATE retires immediately.
  function pickVisibility(next: TemplateVisibility) {
    if (next === visibility || busyVisibility) return;
    if (next === "PUBLIC") {
      setPubTitle(spec?.name ?? "");
      setPubDesc(spec?.description ?? "");
      setPubCategory("Autre");
      setPublishOpen(true);
    } else {
      void makePrivate();
    }
  }

  // Retire from the marketplace (or just set the intent before the first save).
  async function makePrivate() {
    if (!jobId) {
      setVisibility("PRIVATE");
      onVisibilityChange?.("PRIVATE");
      return;
    }
    setBusyVisibility(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/save-job`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "PRIVATE" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Action impossible.");
      setVisibility("PRIVATE");
      onVisibilityChange?.("PRIVATE");
      toast.success("Retiré de la marketplace.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setBusyVisibility(false);
    }
  }

  // Confirm the publish modal: create-or-update the job as PUBLIC + community template.
  async function confirmPublish() {
    const template: PublishFields = {
      title: pubTitle.trim(),
      description: pubDesc.trim(),
      category: pubCategory,
    };
    if (!template.title) {
      toast.error("Donne un titre à ton template.");
      return;
    }
    // No job yet → create it directly as PUBLIC (redirects to the job page).
    if (!jobId) {
      setPublishOpen(false);
      await saveJob("PUBLIC", template);
      return;
    }
    setBusyVisibility(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/save-job`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: "PUBLIC", template }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Publication impossible.");
      setVisibility("PUBLIC");
      onVisibilityChange?.("PUBLIC");
      setPublishOpen(false);
      toast.success("Publié dans la marketplace.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setBusyVisibility(false);
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
            {score}%
          </span>

          {/* Marketplace visibility selector (Phase 2). Hidden until there is a
              spec worth publishing. */}
          {resourceCount > 0 && (
            <VisibilityToggle visibility={visibility} busy={busyVisibility} onPick={pickVisibility} />
          )}

          {!jobId ? (
            <button
              type="button"
              onClick={() => saveJob("PRIVATE")}
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
          ) : specChanged ? (
            <button
              type="button"
              onClick={updateJob}
              disabled={!canUpdate}
              title="Mettre à jour le job avec la version courante"
              className={
                "relative inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-medium transition " +
                (canUpdate
                  ? "bg-accent text-accent-ink hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
                  : "cursor-not-allowed bg-bg-3 text-muted-2")
              }
            >
              {updating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{updating ? "Mise à jour…" : "Mettre à jour le job"}</span>
              {/* Unsaved-changes indicator: pulsing dot on the button corner. */}
              {!updating && (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-warn ring-2 ring-bg-2"
                  style={{ boxShadow: "0 0 0 3px var(--warn-soft)" }}
                />
              )}
            </button>
          ) : (
            <a
              href={`/jobs/${jobId}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[12px] font-medium text-ink-2 transition hover:border-line-2"
            >
              Voir le job
            </a>
          )}
        </div>
      </div>

      {/* Post-update notice: the live deployment no longer matches this spec. */}
      {deploymentStale && jobId && (
        <div className="flex items-start gap-2 border-b border-warn/30 bg-warn-soft/40 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-warn-ink" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] leading-snug text-ink-2">
              Ton déploiement n&apos;est plus à jour avec cette version. Redéploie pour appliquer
              les changements.
            </p>
            <a
              href={`/jobs/${jobId}`}
              className="mt-1.5 inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-accent px-2.5 text-[11.5px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
            >
              <Rocket className="h-3 w-3" />
              Redéployer
            </a>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "graph" ? (
          // Full-bleed: the canvas owns its own scroll/pan, no padding.
          <SpecGraph spec={spec} onApplyOperation={onApplyOperation} />
        ) : (
          <div className="flex-1 overflow-y-auto p-4.5 scrollbar-thin">
            {tab === "summary" && (
              <AuditTab findings={findings} score={score} onApplyOperation={onApplyOperation} />
            )}
            {tab === "spec" && <SpecJsonTab spec={spec} />}
            {tab === "endpoints" && <EndpointsTab spec={spec} />}
            {tab === "dev" && <DevTab conversationId={conversationId} spec={spec} />}
          </div>
        )}
      </div>

      {publishOpen && (
        <PublishModal
          title={pubTitle}
          description={pubDesc}
          category={pubCategory}
          busy={busyVisibility || submitting}
          onTitle={setPubTitle}
          onDescription={setPubDesc}
          onCategory={setPubCategory}
          onCancel={() => setPublishOpen(false)}
          onConfirm={confirmPublish}
        />
      )}
    </aside>
  );
}

// ── Marketplace visibility (Phase 2) ─────────────────────────────────────────

/** Segmented Privé / Public selector for the marketplace visibility. */
function VisibilityToggle({
  visibility,
  busy,
  onPick,
}: {
  visibility: TemplateVisibility;
  busy: boolean;
  onPick: (v: TemplateVisibility) => void;
}) {
  const isPublic = visibility === "PUBLIC";
  return (
    <div
      className="inline-flex h-8 items-center rounded-[9px] border border-line bg-surface p-0.5"
      title="Visibilité dans la marketplace"
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => onPick("PRIVATE")}
        title="Privé — visible de toi seul"
        className={
          "inline-flex h-7 items-center gap-1 rounded-[7px] px-2 text-[11.5px] font-medium transition disabled:opacity-50 " +
          (!isPublic ? "bg-ink text-bg" : "text-muted hover:text-ink-2")
        }
      >
        <Lock className="h-3 w-3" />
        <span className="hidden sm:inline">Privé</span>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onPick("PUBLIC")}
        title="Public — publié comme template communauté"
        className={
          "inline-flex h-7 items-center gap-1 rounded-[7px] px-2 text-[11.5px] font-medium transition disabled:opacity-50 " +
          (isPublic ? "bg-accent text-accent-ink" : "text-muted hover:text-ink-2")
        }
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
        <span className="hidden sm:inline">Public</span>
      </button>
    </div>
  );
}

/** Modal asking for the marketplace listing fields when publishing PUBLIC. */
function PublishModal({
  title,
  description,
  category,
  busy,
  onTitle,
  onDescription,
  onCategory,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  category: string;
  busy: boolean;
  onTitle: (v: string) => void;
  onDescription: (v: string) => void;
  onCategory: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={busy ? undefined : onCancel} aria-hidden />
      <div className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-[16px] border border-line bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-accent-soft text-accent-ink">
              <Globe className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-[14px] font-semibold text-ink">Publier dans la marketplace</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Fermer"
            className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-3.5 px-4 py-4">
          <p className="text-[12.5px] leading-snug text-muted">
            Ton template devient visible par la communauté. Tu peux le retirer à tout moment.
          </p>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Titre</span>
            <input
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              maxLength={80}
              placeholder="Ex : API de réservation de salles"
              className="block h-9 w-full rounded-[9px] border border-line bg-bg-2 px-3 text-[13.5px] text-ink outline-none transition focus:border-ink placeholder:text-muted-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => onDescription(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Ce que fait l'API, en une ou deux phrases…"
              className="block w-full resize-none rounded-[9px] border border-line bg-bg-2 px-3 py-2 text-[13.5px] leading-snug text-ink outline-none transition focus:border-ink placeholder:text-muted-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Catégorie</span>
            <select
              value={category}
              onChange={(e) => onCategory(e.target.value)}
              className="block h-9 w-full rounded-[9px] border border-line bg-bg-2 px-2.5 text-[13.5px] text-ink outline-none transition focus:border-ink"
            >
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-[9px] border border-line bg-surface px-3.5 text-[13px] font-medium text-ink-2 transition hover:border-line-2 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)] disabled:translate-y-0 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
            Publier
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Audit tab (architecture findings + 1-click fixes) ────────────────────────

const SEV_DOT: Record<AuditSeverity, string> = {
  error: "bg-danger",
  warning: "bg-warn",
  info: "bg-muted-2",
};

function AuditTab({
  findings,
  score,
  onApplyOperation,
}: {
  findings: AuditFinding[];
  score: number;
  onApplyOperation?: ApplyOperation;
}) {
  const tone = confidenceTone(score);
  const barColor = tone === "high" ? "bg-accent" : tone === "med" ? "bg-warn" : "bg-danger";
  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.filter((f) => f.severity === "warning").length;
  const [applyingId, setApplyingId] = useState<string | null>(null);

  async function fix(f: AuditFinding) {
    if (!f.fix || !onApplyOperation) return;
    setApplyingId(f.id);
    const res = await onApplyOperation({
      type: f.fix.op.type,
      params: f.fix.op.params,
      confirmed: f.fix.confirmed,
    });
    setApplyingId(null);
    if (!res.ok) {
      toast.error("error" in res && res.error ? res.error : "Correction rejetée.");
    }
    // ok → the spec updates → findings recompute (parent passes a new spec).
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[12px] border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
            Score d&apos;architecture
          </span>
          <span className="font-serif text-[22px] leading-none">
            {score}
            <span className="text-[13px] text-muted">/100</span>
          </span>
        </div>
        <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-bg-3">
          <div
            className={`h-full ${barColor} transition-[width] duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="mt-2.5 text-[12px] leading-snug text-muted">
          {errors > 0
            ? `${errors} problème${errors > 1 ? "s" : ""} critique${errors > 1 ? "s" : ""}`
            : warns > 0
              ? `${warns} amélioration${warns > 1 ? "s" : ""} recommandée${warns > 1 ? "s" : ""}`
              : "Architecture saine."}
        </p>
      </div>

      {findings.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-line-2 bg-surface p-6 text-center text-[12px] text-muted">
          <ShieldCheck className="mx-auto mb-2 h-4 w-4 text-accent-ink" />
          Architecture saine — aucun problème détecté.
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f) => (
            <FindingRow
              key={f.id}
              finding={f}
              applying={applyingId === f.id}
              canFix={Boolean(onApplyOperation)}
              onFix={() => fix(f)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FindingRow({
  finding,
  applying,
  canFix,
  onFix,
}: {
  finding: AuditFinding;
  applying: boolean;
  canFix: boolean;
  onFix: () => void;
}) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-3">
      <div className="flex items-start gap-2">
        <span className={"mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full " + SEV_DOT[finding.severity]} />
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-medium text-ink">{finding.title}</div>
          <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{finding.detail}</div>
        </div>
      </div>
      {finding.fix && canFix && (
        <button
          type="button"
          disabled={applying}
          onClick={onFix}
          className="mt-2 ml-3.5 inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-accent px-2.5 text-[11.5px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)] disabled:translate-y-0 disabled:opacity-50"
        >
          {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
          {finding.fix.label}
        </button>
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
