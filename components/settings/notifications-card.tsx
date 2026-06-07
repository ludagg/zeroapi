"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { SettingsCard } from "./profile-card";

export function NotificationsCard({
  initial,
}: {
  initial: { notifyOnReady: boolean; notifyOnFailed: boolean };
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [notifyOnReady, setNotifyOnReady] = useState(initial.notifyOnReady);
  const [notifyOnFailed, setNotifyOnFailed] = useState(initial.notifyOnFailed);
  const [submitting, setSubmitting] = useState(false);

  const dirty =
    notifyOnReady !== initial.notifyOnReady || notifyOnFailed !== initial.notifyOnFailed;

  async function save() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyOnReady, notifyOnFailed }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t("settings.notifications.errorSave"));
      }
      toast.success(t("settings.notifications.successSave"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.notifications.errorRetry"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsCard
      title={t("settings.notifications.title")}
      subtitle={t("settings.notifications.subtitle")}
    >
      <div className="space-y-3">
        <Toggle
          label={t("settings.notifications.readyLabel")}
          description={t("settings.notifications.readyDesc")}
          checked={notifyOnReady}
          onChange={setNotifyOnReady}
        />
        <Toggle
          label={t("settings.notifications.failedLabel")}
          description={t("settings.notifications.failedDesc")}
          checked={notifyOnFailed}
          onChange={setNotifyOnFailed}
        />
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={submitting || !dirty}
          className="btn-primary h-9 px-4 text-[13px] disabled:opacity-50"
        >
          {submitting ? (
            t("settings.notifications.saving")
          ) : (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t("settings.notifications.save")}
            </>
          )}
        </button>
      </div>
    </SettingsCard>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[10px] border border-line bg-bg-2 px-4 py-3 transition hover:border-line-2">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium">{label}</div>
        <div className="mt-0.5 text-[12.5px] text-muted">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={
          "relative mt-1 inline-block h-5 w-9 flex-shrink-0 rounded-full transition " +
          (checked ? "bg-accent" : "bg-line-2")
        }
      >
        <span
          className={
            "absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow-sm transition " +
            (checked ? "left-[18px]" : "left-0.5")
          }
        />
      </span>
    </label>
  );
}
