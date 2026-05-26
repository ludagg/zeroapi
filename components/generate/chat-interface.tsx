"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Mic,
  Paperclip,
  PenLine,
  Send,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  meta?: string;
  ts: number;
};

type ValidatedPlan = {
  spec: unknown;
  summary: {
    resourceCount: number;
    authStrategy: string | null;
    rolesCount: number;
    endpointCount: number;
    name: string;
  };
};

/**
 * Defense-in-depth: even though the system prompt forbids JSON, LLMs can
 * still leak a spec dump. Strip any fenced code block and any large
 * `{...}` blob that smells like a spec.
 */
function sanitizeAssistant(content: string): string {
  if (!content) return content;
  let out = content;
  out = out.replace(/```[^\n]*\n[\s\S]*?```/g, "");
  out = out.replace(/\{[\s\S]{120,}\}/g, (match) =>
    /"(resources|version|auth|fields)"\s*:/.test(match) ? "" : match,
  );
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-initial",
    role: "assistant",
    content:
      "Salut ! Décris-moi ton API. Je pose des questions au fur et à mesure pour affiner la spec, puis tu lances la génération quand on est tous les deux contents.\n\nTu peux écrire en français, anglais, ou mélanger. Pas besoin d'être technique : parle-moi de **ce que ton produit fait** et **qui l'utilise**.",
    meta: "spec architect",
    ts: Date.now(),
  },
];

const SUGGESTIONS = [
  { icon: <Check className="h-2.5 w-2.5" strokeWidth={3} />, text: "Option A — sécurisé par défaut" },
  { text: "+ Ajouter des notifs SMS" },
  { text: "+ Système de notation" },
  { text: "+ Multi-langues (fon, yoruba)" },
];

export function ChatInterface({
  user,
}: {
  user: { name: string | null; email: string; initials: string };
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [validating, setValidating] = useState(false);
  const [progress, setProgress] = useState(12);
  const [plan, setPlan] = useState<ValidatedPlan | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const canSend = draft.trim().length > 0 && !pending && !validating;

  async function send(content: string) {
    const text = content.trim();
    if (!text || pending) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      ts: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setPending(true);
    // User refined the description — any previously validated plan is stale.
    if (plan) setPlan(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "conversation",
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur de génération.");
      const data = (await res.json()) as {
        reply: string;
        progress: number;
        provider: string;
        model: string;
      };
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: sanitizeAssistant(data.reply),
          meta: `${data.provider} · ${data.model}`,
          ts: Date.now(),
        },
      ]);
      setProgress((p) => Math.min(100, Math.max(p, data.progress)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  }

  async function validatePlan() {
    if (messages.length < 2) {
      toast.error("Décris d'abord ton API.");
      return;
    }
    setValidating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "validate",
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as
        | { ok: true; spec: unknown; summary: ValidatedPlan["summary"] }
        | { ok: false; error: string };
      if (!res.ok || !("ok" in data) || !data.ok) {
        throw new Error(("error" in data && data.error) || "Validation impossible.");
      }
      setPlan({ spec: data.spec, summary: data.summary });
      setProgress(100);
      const s = data.summary;
      const authLabel = s.authStrategy ?? "pas d'auth";
      const rolesPart = s.rolesCount > 0 ? `, ${s.rolesCount} rôle${s.rolesCount > 1 ? "s" : ""}` : "";
      const summaryText =
        `✅ **Plan validé** — ${s.resourceCount} ressource${s.resourceCount > 1 ? "s" : ""}, ` +
        `${authLabel}${rolesPart}, ${s.endpointCount} endpoint${s.endpointCount > 1 ? "s" : ""} prévu${s.endpointCount > 1 ? "s" : ""}.` +
        `\n\nClique **Générer le backend** quand tu es prêt.`;
      setMessages((m) => [
        ...m,
        {
          id: `a-validated-${Date.now()}`,
          role: "assistant",
          content: summaryText,
          meta: "plan validé",
          ts: Date.now(),
        },
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setValidating(false);
    }
  }

  async function launchGeneration() {
    if (!plan) {
      toast.error("Valide d'abord le plan.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "launch", spec: plan.spec }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Lancement impossible.");
      const data = (await res.json()) as { jobId: string };
      toast.success("Génération lancée.");
      router.push(`/jobs/${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex h-screen flex-col bg-bg">
        <header className="flex h-[60px] flex-shrink-0 items-center gap-3 border-b border-line bg-bg px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-[13px] text-muted transition hover:bg-bg-2 hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            Console
          </Link>
          <div className="ml-2 min-w-0">
            <div className="flex items-center gap-1.5 truncate text-[14px] font-medium">
              <ShieldCheck className="h-3 w-3 text-muted" />
              Nouvelle API · brouillon
            </div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-muted">
              Auto-save activé
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              aria-label="Nouvelle conversation"
              className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-line bg-surface text-ink-2 transition hover:-translate-y-px hover:border-line-2"
            >
              <PenLine className="h-[15px] w-[15px]" />
            </button>
            <ThemeToggle />
          </div>
        </header>

        <div ref={threadRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto flex max-w-[760px] flex-col gap-7 px-6 pb-6 pt-8">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} userInitials={user.initials} />
            ))}
            {pending && <TypingBubble />}
          </div>
        </div>

        <div className="flex-shrink-0 bg-gradient-to-t from-bg via-bg/85 to-transparent px-6 pb-5 pt-3.5">
          <div className="mx-auto max-w-[760px]">
            <div className="mb-3 flex flex-wrap gap-1.5 px-1">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDraft((d) => (d ? d : s.text.replace(/^[+✓]\s*/, "")))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink-2 transition hover:-translate-y-px hover:border-ink"
                >
                  {s.icon}
                  {s.text}
                </button>
              ))}
            </div>

            <div className="rounded-[16px] border border-line bg-surface shadow-md transition focus-within:border-ink">
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 180) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) void send(draft);
                  }
                }}
                rows={1}
                placeholder="Réponds, précise, demande des changements…"
                className="block min-h-12 w-full resize-none rounded-t-[16px] border-0 bg-transparent px-4 pb-1.5 pt-3.5 text-[15px] leading-snug text-ink outline-none placeholder:text-muted-2"
              />
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <div className="flex items-center gap-0.5">
                  <ToolBtn title="Joindre un fichier">
                    <Paperclip className="h-3.5 w-3.5" />
                  </ToolBtn>
                  <ToolBtn title="Dicter">
                    <Mic className="h-3.5 w-3.5" />
                  </ToolBtn>
                  <button
                    type="button"
                    className="inline-flex h-7.5 items-center gap-1.5 rounded-[7px] px-2 py-1 font-mono text-[11px] text-muted transition hover:bg-bg-2 hover:text-ink"
                  >
                    FR
                    <ChevronDown className="h-2.5 w-2.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10.5px] tracking-[0.04em] text-muted-2">
                    <kbd className="rounded-[4px] border border-line bg-bg px-1.5 py-px font-mono">
                      ⏎
                    </kbd>{" "}
                    envoyer
                  </span>
                  <button
                    type="button"
                    aria-label="Envoyer"
                    disabled={!canSend}
                    onClick={() => send(draft)}
                    className={
                      "grid h-[34px] w-[34px] place-items-center rounded-[9px] transition disabled:opacity-35 " +
                      (canSend
                        ? "bg-accent text-accent-ink hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
                        : "bg-ink text-bg")
                    }
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between px-1 font-mono text-[10.5px] tracking-[0.03em] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-2.5 w-2.5" />
                Conversations chiffrées · jamais utilisées pour l&apos;entraînement
              </span>
              <span className="inline-flex items-center gap-2.5">
                modèle <b className="font-medium text-ink">spec-architect-v3</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      <SpecSide
        progress={progress}
        canValidate={messages.length >= 3 && !validating && !pending && !plan}
        validating={validating}
        plan={plan}
        pending={pending}
        onValidate={validatePlan}
        onLaunch={launchGeneration}
      />
    </div>
  );
}

function Bubble({
  message,
  userInitials,
}: {
  message: ChatMessage;
  userInitials: string;
}) {
  if (message.role === "user") {
    return (
      <div className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3.5">
        <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-[8px] bg-gradient-to-br from-[#2A6FDB] to-accent font-mono text-[12px] font-semibold text-accent-ink">
          {userInitials}
        </div>
        <div>
          <div className="mb-2 text-[12.5px] text-muted">
            <b className="font-medium text-ink">Toi</b> · à l&apos;instant
          </div>
          <div className="rounded-[12px] border border-line bg-bg-2 px-4 py-3.5 text-[15px] leading-snug text-ink">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  const safe = sanitizeAssistant(message.content);
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3.5">
      <span className="brand-mark mt-0.5 h-8 w-8 text-[12px]">
        <span>0</span>
      </span>
      <div>
        <div className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <b className="font-medium text-ink">ZeroAPI</b>
          {message.meta && (
            <span className="rounded-[4px] border border-line bg-bg-2 px-1.5 py-px font-mono text-[10px] tracking-[0.04em]">
              {message.meta}
            </span>
          )}
        </div>
        <div className="space-y-3.5 text-[15px] leading-relaxed text-ink-2">
          {safe.split("\n\n").map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: applyMarkdown(p) }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function applyMarkdown(s: string): string {
  return s
    .replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-ink font-semibold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="font-mono text-[13px] px-1.5 py-px bg-bg-2 rounded">$1</code>');
}

function TypingBubble() {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3.5">
      <span className="brand-mark mt-0.5 h-8 w-8 text-[12px]">
        <span>0</span>
      </span>
      <div>
        <div className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <b className="font-medium text-ink">ZeroAPI</b>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-accent-ink">
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
              style={{ boxShadow: "0 0 0 3px var(--accent-glow)" }}
            />
            en train d&apos;écrire
          </span>
        </div>
        <div className="flex gap-1 py-2">
          <i className="block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-2" />
          <i
            className="block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-2"
            style={{ animationDelay: ".15s" }}
          />
          <i
            className="block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-2"
            style={{ animationDelay: ".3s" }}
          />
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className="grid h-[30px] w-[30px] place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
    >
      {children}
    </button>
  );
}

function SpecSide({
  progress,
  canValidate,
  validating,
  plan,
  pending,
  onValidate,
  onLaunch,
}: {
  progress: number;
  canValidate: boolean;
  validating: boolean;
  plan: ValidatedPlan | null;
  pending: boolean;
  onValidate: () => void;
  onLaunch: () => void;
}) {
  const launchEnabled = plan !== null && !pending;
  return (
    <aside className="hidden flex-col overflow-hidden border-l border-line bg-bg-2 lg:flex">
      <div className="flex items-center justify-between border-b border-line px-4.5 py-4">
        <div className="flex items-center gap-2 text-[13.5px] font-semibold">
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
            style={{ boxShadow: "0 0 0 3px var(--accent-glow)" }}
          />
          {plan ? "Plan validé" : "Spec en cours"}
        </div>
        <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-ink-2">
          {progress}% prête
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4.5 scrollbar-thin">
        <div className="rounded-[12px] border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              Confiance
            </span>
            <span className="font-serif text-[22px] leading-none">{progress}%</span>
          </div>
          <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-bg-3">
            <div
              className="h-full bg-accent transition-[width] duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2.5 text-[12px] leading-snug text-muted">
            {plan
              ? "Spec complète ✓ Tu peux lancer la génération."
              : "Continue à préciser ton API. Plus c'est détaillé, mieux on génère."}
          </p>
        </div>

        {plan ? (
          <SpecSection label="Plan détecté" count={`${plan.summary.resourceCount} ressources`}>
            <SpecRow label="Endpoints prévus" meta={String(plan.summary.endpointCount)} />
            <SpecRow
              label="Authentification"
              meta={plan.summary.authStrategy ?? "—"}
            />
            <SpecRow label="Rôles RBAC" meta={String(plan.summary.rolesCount)} />
          </SpecSection>
        ) : (
          <SpecSection label="Sécurité" count="auto">
            <SpecRow label="JWT + refresh tokens" meta="auto" />
            <SpecRow label="RBAC + 3 rôles" meta="auto" />
            <SpecRow label="Rate limit 120/min" meta="auto" />
          </SpecSection>
        )}

        <SpecSection label="Extras inclus">
          <SpecRow label="Tests Vitest" meta="✓" />
          <SpecRow label="Docs OpenAPI 3.1" meta="✓" />
          <SpecRow label="Logs structurés" meta="✓" />
        </SpecSection>

        {!plan && (
          <div className="rounded-[12px] border border-dashed border-line-2 bg-surface p-4 text-center text-[12px] text-muted">
            <FileText className="mx-auto mb-2 h-4 w-4" />
            Les modèles détectés s&apos;affichent ici dès que ta description est assez précise.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-line bg-surface px-4.5 py-4">
        {!plan ? (
          <button
            type="button"
            onClick={onValidate}
            disabled={!canValidate}
            className={
              "group inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-medium transition " +
              (canValidate
                ? "border border-line bg-surface text-ink hover:-translate-y-px hover:border-ink"
                : "cursor-not-allowed border border-line bg-bg-3 text-muted-2")
            }
          >
            {validating ? (
              <>
                <span className="block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Validation…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Valider le plan
              </>
            )}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onLaunch}
          disabled={!launchEnabled}
          title={!plan ? "Valide le plan pour activer" : undefined}
          className={
            "group inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-medium transition " +
            (launchEnabled
              ? "bg-accent text-accent-ink shadow-[0_6px_18px_var(--accent-glow)] hover:-translate-y-px hover:shadow-[0_10px_26px_var(--accent-glow)]"
              : "cursor-not-allowed bg-bg-3 text-muted-2")
          }
        >
          {pending ? (
            "Préparation…"
          ) : (
            <>
              Générer le backend
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

function SpecRow({ label, meta }: { label: string; meta: string }) {
  return (
    <div
      className="grid grid-cols-[1fr_auto] items-center border-b border-dashed border-line py-1.5 font-mono text-[12px] text-ink-2 last:border-b-0"
    >
      <span>{label}</span>
      <span className="text-[10.5px] text-muted">{meta}</span>
    </div>
  );
}
