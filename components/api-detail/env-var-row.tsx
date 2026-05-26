"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteEnvVariable } from "@/app/(dashboard)/apis/[id]/settings/actions";
import { EnvVarForm } from "./env-var-form";

type Row = {
  id: string;
  jobId: string;
  key: string;
  masked: string;
  clear: string | null;
  managed: boolean;
  createdAt: string;
};

export function EnvVarRow({ row }: { row: Row }) {
  const [editing, setEditing] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [deleting, startDelete] = useTransition();

  function onDelete() {
    if (!confirm(`Supprimer la variable ${row.key} ? Cette action est irréversible.`)) return;
    startDelete(async () => {
      try {
        await deleteEnvVariable(row.jobId, row.id);
        toast.success(`${row.key} supprimée.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Suppression impossible.");
      }
    });
  }

  return (
    <div className="border-t border-line px-4 py-3 first:border-t-0">
      <div className="grid grid-cols-[200px_minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-mono text-[12.5px] font-medium">{row.key}</span>
            {row.managed && (
              <span
                title="Variable gérée par ZeroAPI"
                className="inline-flex items-center gap-1 rounded-[4px] border border-line bg-bg-2 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.04em] text-muted"
              >
                <Lock className="h-2 w-2" />
                managed
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 font-mono text-[12px] text-ink-2">
          <span className="truncate">{reveal && row.clear ? row.clear : row.masked}</span>
          {row.clear && (
            <button
              type="button"
              onClick={() => setReveal((s) => !s)}
              aria-label={reveal ? "Masquer" : "Afficher"}
              className="ml-2 inline-flex h-6 w-6 align-middle place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
            >
              {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!row.managed && (
            <>
              <button
                type="button"
                onClick={() => setEditing((e) => !e)}
                className="rounded-[7px] border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-2 transition hover:border-line-2"
              >
                {editing ? "Annuler" : "Modifier"}
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                aria-label="Supprimer"
                className="grid h-8 w-8 place-items-center rounded-[7px] text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {editing && !row.managed && (
        <div className="mt-3 rounded-[10px] border border-line bg-bg-2 p-3">
          <EnvVarForm jobId={row.jobId} defaultKey={row.key} />
        </div>
      )}
    </div>
  );
}

export type { Row as EnvVarRowData };
