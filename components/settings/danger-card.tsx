"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { SettingsCard } from "./profile-card";

export function DangerCard({ email }: { email: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const canDelete = confirm.trim().toLowerCase() === email.toLowerCase();

  async function handleDelete() {
    if (!canDelete || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: confirm }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Suppression impossible.");
      }
      await authClient.signOut().catch(() => undefined);
      toast.success("Compte supprimé.");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
      setPending(false);
    }
  }

  return (
    <SettingsCard
      title="Zone dangereuse"
      subtitle="Supprimer ton compte est définitif. Tous tes jobs, APIs, bases et déploiements sont effacés."
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-danger/40 bg-danger-soft px-3 text-[13px] font-medium text-danger transition hover:border-danger/70"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer mon compte
        </button>
      ) : (
        <div className="space-y-3 rounded-[10px] border border-danger/30 bg-danger-soft p-4">
          <div className="flex items-start gap-2 text-[13px] text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              Pour confirmer, saisis ton email <b className="font-mono">{email}</b> ci-dessous.
            </p>
          </div>
          <input
            type="email"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={email}
            className="input-base"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirm("");
              }}
              className="inline-flex h-9 items-center rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 transition hover:border-line-2"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete || pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-danger px-3 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {pending ? "Suppression…" : "Supprimer définitivement"}
            </button>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}
