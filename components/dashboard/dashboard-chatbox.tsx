"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

const PLACEHOLDERS = [
  "API e-commerce avec paiement Wave et livraison à domicile…",
  "Backend RH avec congés, paie, et fiches employés…",
  "API de réservation de restaurants avec disponibilités…",
  "Plateforme de cours en ligne avec quiz et certificats…",
  "Système de tickets support avec attribution automatique…",
  "API de marketplace de location de matériel pro…",
];

const TEMPLATES: Array<{ name: string; prompt: string }> = [
  {
    name: "E-commerce Mobile Money",
    prompt:
      "Je veux une API e-commerce pour le marché ouest-africain : catalogue de produits, panier, commandes, paiement Wave et MTN MoMo. JWT + rôles admin/client. Rate limit 120 req/min.",
  },
  {
    name: "Livraison locale",
    prompt:
      "API de livraison express avec courses, livreurs, clients, géolocalisation des courses, notifications SMS. Rôles admin/courier/client.",
  },
  {
    name: "SaaS B2B avec équipes",
    prompt:
      "Backend SaaS multi-tenant : workspaces, membres, invitations, projets, audit log. Auth JWT + RBAC owner/admin/member. Webhooks pour intégrations.",
  },
  {
    name: "LMS — Cours en ligne",
    prompt:
      "API de plateforme de cours : cours, leçons, quiz, inscriptions, progression, certificats. Rôles teacher/student/admin.",
  },
];

export function DashboardChatbox() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // Rotate placeholder every 4 seconds while empty.
  useEffect(() => {
    if (value.length > 0) return;
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [value]);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // 1 to 4 lines: line-height 22px, base padding ~14px top+bottom
    el.style.height = Math.min(el.scrollHeight, 22 * 4 + 28) + "px";
  }

  async function submit() {
    const text = value.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstMessage: text }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        throw new Error(data.error ?? "Création impossible.");
      }
      router.push(`/conversations/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
      setSubmitting(false);
    }
  }

  function useTemplate(template: (typeof TEMPLATES)[number]) {
    setValue(template.prompt);
    setTemplatesOpen(false);
    setTimeout(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    }, 0);
  }

  const canSubmit = value.trim().length > 0 && !submitting;
  const placeholder = PLACEHOLDERS[placeholderIdx];

  return (
    <div className="relative mb-7 overflow-hidden rounded-[14px] bg-ink px-5 py-5 text-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] -top-[60%] h-[320px] w-[320px] opacity-90"
        style={{
          background: "radial-gradient(circle, var(--accent-glow), transparent 60%)",
        }}
      />

      <div className="relative z-10 mb-4 flex flex-wrap items-center gap-3">
        <div className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-[10px] bg-accent text-accent-ink">
          <Zap className="h-5 w-5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[22px] leading-tight">
            Décris ta prochaine <em className="italic">API</em>.
          </div>
          <div className="mt-0.5 text-[13px] text-white/65">
            Génération asynchrone · ferme l&apos;onglet, on te prévient quand c&apos;est prêt.
          </div>
        </div>
      </div>

      <div className="relative z-10 rounded-[12px] border border-white/[0.14] bg-white/[0.06] focus-within:border-white/30">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resizeTextarea();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSubmit) void submit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={submitting}
          className="block min-h-12 w-full resize-none rounded-t-[12px] border-0 bg-transparent px-4 pb-1.5 pt-3.5 text-[15px] leading-snug text-bg outline-none placeholder:text-white/40"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setTemplatesOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/[0.14] bg-white/[0.08] px-3 text-[13px] font-medium text-bg transition hover:bg-white/[0.14]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Templates
              <ChevronDown
                className={
                  "h-3 w-3 transition " + (templatesOpen ? "rotate-180" : "rotate-0")
                }
              />
            </button>
            {templatesOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setTemplatesOpen(false)}
                  aria-hidden
                />
                <div className="absolute bottom-full left-0 z-30 mb-2 w-[300px] overflow-hidden rounded-[10px] border border-line bg-surface text-ink shadow-xl">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => useTemplate(t)}
                      className="flex w-full flex-col items-start gap-1 border-b border-line px-3.5 py-2.5 text-left transition hover:bg-bg-2 last:border-b-0"
                    >
                      <span className="text-[13.5px] font-medium">{t.name}</span>
                      <span className="line-clamp-2 text-[12px] text-muted">{t.prompt}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent px-4 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {submitting ? "Création…" : "Démarrer"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
