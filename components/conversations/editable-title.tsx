"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

export function EditableTitle({
  id,
  initialTitle,
}: {
  id: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setValue(initialTitle);
  }, [initialTitle]);

  async function commit() {
    const next = value.trim();
    if (!next || next === initialTitle) {
      setEditing(false);
      setValue(initialTitle);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/conversations/${id}`, {
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
      setValue(initialTitle);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setEditing(false);
            setValue(initialTitle);
          }
        }}
        disabled={saving}
        className="w-full rounded-[6px] border border-accent bg-bg px-1.5 py-0.5 text-[14px] font-medium text-ink outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Renommer"
      className="group inline-flex max-w-full items-center gap-1.5 truncate rounded-[6px] px-1.5 py-0.5 text-[14px] font-medium text-ink transition hover:bg-bg-2"
    >
      <span className="truncate">{initialTitle}</span>
      <Pencil className="h-3 w-3 flex-shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}
