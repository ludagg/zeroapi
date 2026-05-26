"use client";

import { useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { resetDatabase, deleteDatabase } from "@/app/(dashboard)/databases/[id]/actions";

export function DangerActions({
  dbId,
  dbName,
  managed,
}: {
  dbId: string;
  dbName: string;
  managed: boolean;
}) {
  const [resetting, startReset] = useTransition();
  const [deleting, startDelete] = useTransition();

  function handleReset() {
    if (
      !confirm(
        `Réinitialiser la base ${dbName} ? Toutes les données seront effacées. Cette action est irréversible.`,
      )
    )
      return;
    startReset(async () => {
      try {
        await resetDatabase(dbId);
        toast.success("Base réinitialisée.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Réinitialisation impossible.");
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Supprimer la base ${dbName} ? Cette action est irréversible et libère le slot.`,
      )
    )
      return;
    startDelete(async () => {
      try {
        await deleteDatabase(dbId);
        toast.success("Base supprimée.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Suppression impossible.");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleReset}
        disabled={resetting || deleting}
        className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 transition hover:border-line-2 disabled:opacity-50"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {resetting ? "Réinitialisation…" : "Réinitialiser"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={resetting || deleting || managed}
        title={managed ? "Base gérée — non supprimable" : "Supprimer définitivement"}
        className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-danger/30 bg-danger-soft px-3 text-[13px] font-medium text-danger transition hover:border-danger disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {deleting ? "Suppression…" : "Supprimer"}
      </button>
    </div>
  );
}
