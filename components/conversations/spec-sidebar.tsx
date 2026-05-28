"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  FileText,
  Gauge,
  GitBranch,
  Image,
  Key,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";
import {
  computeInsights,
  confidenceTone,
  type ChatMessage,
  type ConversationInsights,
} from "@/lib/conversation-helpers";

export function SpecSidebar({
  conversationId,
  messages,
  spec,
  jobId,
  variant,
  onLaunch,
  pending,
}: {
  conversationId: string;
  messages: ChatMessage[];
  spec: ZeroAPISpec | null;
  jobId: string | null;
  variant: "desktop" | "drawer";
  onLaunch?: () => void;
  pending?: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const insights = useMemo(() => computeInsights(messages, spec), [messages, spec]);
  const tone = confidenceTone(insights.confidence);
  const canLaunch = insights.confidence >= 50 && !pending && !submitting;

  async function generate() {
    if (!canLaunch) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/generate`, {
        method: "POST",
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "Génération impossible.");
      }
      toast.success(jobId ? "Régénération lancée." : "Génération lancée.");
      onLaunch?.();
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  const isDrawer = variant === "drawer";
  const isModification = Boolean(jobId);
  const detectedModelVisible = insights.confidence >= 70;

  return (
    <aside
      className={
        isDrawer
          ? "flex h-full flex-col overflow-hidden bg-bg-2 pt-14"
          : "hidden flex-col overflow-hidden border-l border-line bg-bg-2 lg:flex"
      }
    >
      <div className="flex items-center justify-between border-b border-line px-4.5 py-4">
        <div className="flex items-center gap-2 text-[13.5px] font-semibold">
          <span
            className={
              "h-1.5 w-1.5 rounded-full " +
              (tone === "high" ? "bg-accent" : tone === "med" ? "bg-warn" : "bg-danger")
            }
            style={
              tone === "high"
                ? { boxShadow: "0 0 0 3px var(--accent-glow)" }
                : undefined
            }
          />
          Spec en cours
        </div>
        <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-ink-2">
          {insights.confidence}% prête
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4.5 scrollbar-thin">
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
          <SpecSection
            label="Relations"
            count={`${insights.relations.length}`}
          >
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
          <SpecSection
            label="Features"
            count={`${insights.features.length}`}
          >
            {insights.features.includes("fileUpload") && (
              <SpecRow
                icon={<Image className="h-3 w-3" aria-hidden />}
                label="Upload fichiers"
                meta="S3 · R2 · local"
                enabled
              />
            )}
            {insights.features.includes("webhooks") && (
              <SpecRow
                icon={<Webhook className="h-3 w-3" />}
                label="Webhooks"
                meta="inbound / outbound"
                enabled
              />
            )}
            {insights.features.includes("search") && (
              <SpecRow
                icon={<Search className="h-3 w-3" />}
                label="Recherche"
                meta="?q="
                enabled
              />
            )}
            {insights.features.includes("pagination") && (
              <SpecRow
                icon={<Gauge className="h-3 w-3" />}
                label="Pagination"
                meta="cursor + offset"
                enabled
              />
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
            <button
              type="button"
              onClick={generate}
              disabled={!canLaunch}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-accent text-[14px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                "Lancement…"
              ) : (
                <>
                  {isModification && <RefreshCw className="h-3.5 w-3.5" />}
                  {isModification ? "Régénérer" : "Générer le backend"} →
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="rounded-[12px] border border-dashed border-line-2 bg-surface p-4 text-center text-[12px] text-muted">
            <FileText className="mx-auto mb-2 h-4 w-4" />
            Continue à préciser ton API : ressources, authentification, rôles. Le modèle s&apos;active
            quand la confiance dépasse 70 %.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-line bg-surface px-4.5 py-4">
        <button
          type="button"
          onClick={generate}
          disabled={!canLaunch}
          className={
            "group inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-medium transition " +
            (canLaunch
              ? "bg-ink text-bg hover:-translate-y-px hover:shadow-md"
              : "cursor-not-allowed bg-bg-3 text-muted-2")
          }
        >
          {submitting ? (
            "Lancement…"
          ) : (
            <>
              {isModification ? "Régénérer" : "Générer le backend"}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </>
          )}
        </button>
        <div className="text-center font-mono text-[10.5px] tracking-[0.03em] text-muted">
          <b className="font-medium text-ink">~ 2 min</b> · asynchrone · on te prévient
        </div>
      </div>
    </aside>
  );
}

function ConfidenceCard({
  confidence,
  tone,
}: {
  confidence: number;
  tone: "high" | "med" | "low";
}) {
  const barColor =
    tone === "high" ? "bg-accent" : tone === "med" ? "bg-warn" : "bg-danger";
  const message =
    tone === "high"
      ? "Spec quasi complète, tu peux lancer."
      : tone === "med"
        ? "Bon début. Précise auth, rôles et ressources."
        : "Trop tôt — décris les ressources principales.";

  return (
    <div className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          Confiance
        </span>
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
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
        {count && (
          <span className="rounded-full bg-bg-2 px-1.5 py-px font-mono text-[10.5px] text-ink-2">
            {count}
          </span>
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
      <span className={"text-[10.5px] " + (enabled ? "text-accent-ink" : "text-muted")}>
        {meta}
      </span>
    </div>
  );
}
