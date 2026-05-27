"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function RemoveButton({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handle() {
    if (pending) return;
    const ok = window.confirm(`Retirer ${email} de l'équipe ?`);
    if (!ok) return;
    setPending(true);
    try {
      const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Suppression impossible.");
      }
      toast.success("Membre retiré.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-label={`Retirer ${email}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
