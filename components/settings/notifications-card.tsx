"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { SettingsCard } from "./profile-card";

export function NotificationsCard({
  initial,
}: {
  initial: { notifyOnReady: boolean; notifyOnFailed: boolean };
}) {
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
        throw new Error(data.error ?? "Enregistrement impossible.");
      }
      toast.success("Préférences enregistrées.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsCard
      title="Notifications"
      subtitle="On t'envoie un email quand un job change d'état. Tu peux désactiver ici."
    >
      <div className="space-y-3">
        <Toggle
          label="Email quand un job est prêt"
          description="Quand une API que tu as générée passe en statut PRÊT."
          checked={notifyOnReady}
          onChange={setNotifyOnReady}
        />
        <Toggle
          label="Email en cas d'échec"
          description="Quand une génération échoue, on t'avertit avec le message d'erreur."
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
            "Enregistrement…"
          ) : (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Enregistrer
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
