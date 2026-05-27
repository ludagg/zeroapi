"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Pencil, X } from "lucide-react";
import type { JobStatus } from "@prisma/client";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";

export type ConversationCardData = {
  id: string;
  title: string;
  lastMessage: string;
  messagesCount: number;
  updatedAt: string;
  job: { id: string; name: string; status: JobStatus } | null;
};

const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: "En file",
  RUNNING: "En cours",
  READY: "Prêt",
  DEPLOYED: "En ligne",
  FAILED: "Échec",
};

const JOB_STATUS_CLASS: Record<JobStatus, string> = {
  PENDING: "border border-dashed border-line-2 text-muted",
  RUNNING: "bg-warn-soft text-warn-ink",
  READY: "bg-accent text-accent-ink",
  DEPLOYED: "bg-accent text-accent-ink",
  FAILED: "bg-danger-soft text-danger",
};

export function ConversationCard({ data }: { data: ConversationCardData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data.title);
  const [saving, setSaving] = useState(false);

  async function commit() {
    const next = value.trim();
    if (!next || next === data.title) {
      setEditing(false);
      setValue(data.title);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/conversations/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Renommage impossible.");
      }
      toast.success("Conversation renommée.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
      setValue(data.title);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setEditing(false);
    setValue(data.title);
  }

  return (
    <article className="overflow-hidden rounded-[14px] border border-line bg-surface transition hover:-translate-y-px hover:border-line-2 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") cancel();
                }}
                autoFocus
                disabled={saving}
                className="min-w-0 flex-1 rounded-[7px] border border-accent bg-bg px-2 py-1 text-[15px] font-semibold text-ink outline-none"
              />
              <button
                type="button"
                onClick={commit}
                disabled={saving}
                aria-label="Valider"
                className="grid h-7 w-7 place-items-center rounded-[7px] bg-accent text-accent-ink transition hover:opacity-90 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                aria-label="Annuler"
                className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-[15.5px] font-semibold text-ink">{data.title}</h2>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Renommer"
                className="grid h-7 w-7 place-items-center rounded-[7px] text-muted opacity-0 transition group-hover:opacity-100 hover:bg-bg-2 hover:text-ink"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        {data.job && (
          <span
            className={
              "inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-[0.04em] " +
              JOB_STATUS_CLASS[data.job.status]
            }
          >
            {JOB_STATUS_LABEL[data.job.status]}
          </span>
        )}
      </div>

      <p className="mt-2 line-clamp-2 px-4 text-[13.5px] text-muted">
        {data.lastMessage || "Pas encore de message."}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line bg-bg-2 px-4 py-2.5 font-mono text-[11px] text-muted">
        <span>
          {data.messagesCount} message{data.messagesCount > 1 ? "s" : ""} ·{" "}
          {formatRelativeTime(data.updatedAt)}
          {data.job && (
            <>
              {" · "}
              <span className="text-ink-2">{data.job.name}</span>
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-[11px] text-muted transition hover:text-ink"
            >
              <Pencil className="h-3 w-3" />
              Renommer
            </button>
          )}
          <Link
            href={`/conversations/${data.id}`}
            className="inline-flex h-7 items-center gap-1 rounded-[6px] bg-ink px-2.5 text-[11.5px] font-medium text-bg transition hover:-translate-y-px"
          >
            Continuer
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}
