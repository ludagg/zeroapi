"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function RemoveButton({ id, email }: { id: string; email: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handle() {
    if (pending) return;
    const ok = window.confirm(t("members.remove.confirmMessage", { email }));
    if (!ok) return;
    setPending(true);
    try {
      const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t("members.remove.errorRemove"));
      }
      toast.success(t("members.remove.successRemove"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("members.remove.errorRetry"));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-label={t("members.remove.ariaLabel", { email })}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
