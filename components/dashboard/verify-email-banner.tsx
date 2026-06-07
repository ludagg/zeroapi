"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useTranslations("dashboard");
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  if (dismissed) return null;

  async function resend() {
    if (pending || sent) return;
    setPending(true);
    try {
      const res = await fetch("/api/account/send-verification", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Envoi impossible.");
      }
      setSent(true);
      toast.success(`Email envoyé à ${email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("verifyEmail.errorRetry"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-warn-soft px-4 py-2 text-[12.5px] text-warn-ink sm:px-6">
      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="flex-1">
        {t.rich("verifyEmail.message", {
          email,
          b: (chunks) => <b className="font-medium">{chunks}</b>,
        })}
      </span>
      <button
        type="button"
        onClick={resend}
        disabled={pending || sent}
        className="rounded-[6px] border border-warn-ink/30 bg-surface/60 px-2.5 py-1 font-mono text-[11px] font-medium tracking-[0.04em] text-warn-ink transition hover:border-warn-ink/60 disabled:opacity-50"
      >
        {sent ? t("verifyEmail.sent") : pending ? t("verifyEmail.sending") : t("verifyEmail.resend")}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("verifyEmail.closeAriaLabel")}
        className="grid h-6 w-6 place-items-center rounded-[6px] text-warn-ink/70 transition hover:bg-surface/60 hover:text-warn-ink"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
