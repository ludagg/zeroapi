"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES, type Template } from "@/lib/templates";

export function NewConversationBox() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 22 * 4 + 28) + "px";
  }

  async function submit(prompt?: string) {
    const text = (prompt ?? value).trim();
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

  function useTemplate(template: Template) {
    setTemplatesOpen(false);
    setValue(template.prompt);
    setTimeout(() => {
      resizeTextarea();
      void submit(template.prompt);
    }, 0);
  }

  const canSubmit = value.trim().length > 0 && !submitting;

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
            Démarre une <em className="italic">nouvelle conversation</em>.
          </div>
          <div className="mt-0.5 text-[13px] text-white/65">
            Décris ton API en quelques phrases, ou choisis un template.
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
          placeholder="Ex : API de gestion de pharmacie avec stock, ordonnances et paiement Wave…"
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
                <div className="absolute bottom-full left-0 z-30 mb-2 w-[340px] max-h-[60vh] overflow-y-auto rounded-[10px] border border-line bg-surface text-ink shadow-xl scrollbar-thin">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => useTemplate(t)}
                      className="flex w-full items-start gap-3 border-b border-line px-3.5 py-3 text-left transition hover:bg-bg-2 last:border-b-0"
                    >
                      <span className="mt-0.5 text-[18px] leading-none">{t.emoji}</span>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-[13.5px] font-medium">{t.name}</span>
                        <span className="line-clamp-2 text-[12px] text-muted">{t.prompt}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => submit()}
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
