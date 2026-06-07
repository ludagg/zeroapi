"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function DashboardChatbox() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const PLACEHOLDERS: string[] = t.raw("chatbox.placeholders") as string[];

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
        throw new Error(data.error ?? t("chatbox.errorCreate"));
      }
      router.push(`/conversations/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("chatbox.errorRetry"));
      setSubmitting(false);
    }
  }

  const canSubmit = value.trim().length > 0 && !submitting;
  const placeholder = PLACEHOLDERS[placeholderIdx];

  return (
    <div
      className="zi-card-in relative mb-7 rounded-[16px] border border-line bg-surface px-[18px] pb-[14px] pt-[18px] text-left shadow-lg"
      style={{ "--d": "1s" } as React.CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: "-1px",
          borderRadius: "17px",
          padding: "1px",
          background: "linear-gradient(180deg, var(--accent), transparent 60%)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          opacity: 0.5,
        }}
      />

      <div
        className="zi-reveal relative"
        style={{ "--d": "1.1s" } as React.CSSProperties}
      >
      <div className="mb-3.5 flex items-center gap-2.5 border-b border-dashed border-line pb-3 font-mono text-[12px] text-muted">
        <div className="flex gap-1.5">
          <i className="h-[9px] w-[9px] rounded-full bg-accent" />
          <i className="h-[9px] w-[9px] rounded-full bg-line-2" />
          <i className="h-[9px] w-[9px] rounded-full bg-line-2" />
        </div>
        <span>{t("chatbox.newProject")}</span>
      </div>

      <div className="flex min-h-[76px] items-start gap-3">
        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-[8px] bg-accent-soft font-mono text-[13px] font-semibold text-accent-ink">
          ›_
        </div>
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
          className="min-h-[56px] flex-1 resize-none border-0 bg-transparent text-[clamp(16px,1.8vw,19px)] leading-[1.45] text-ink outline-none placeholder:text-muted-2"
        />
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.04em] text-muted-2">
          <kbd className="rounded-[5px] border border-b-2 border-line bg-bg px-1.5 py-0.5 text-ink-2">
            ⏎
          </kbd>{" "}
          {t("chatbox.generateHint")} ·{" "}
          <kbd className="rounded-[5px] border border-b-2 border-line bg-bg px-1.5 py-0.5 text-ink-2">
            ⇧⏎
          </kbd>{" "}
          {t("chatbox.newlineHint")}
        </span>
        <button
          type="button"
          onClick={() => submit()}
          disabled={!canSubmit}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[8px] bg-ink px-3.5 text-[13px] font-medium text-bg transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {submitting ? t("chatbox.generating") : t("chatbox.generate")}
          <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
        </button>
      </div>
      </div>
      <span aria-hidden className="zi-bar" />
    </div>
  );
}
