"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

type Plan = "FREE" | "STARTER" | "PRO" | "BUSINESS";

export function InviteButton({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [pending, setPending] = useState(false);

  const locked = plan === "FREE";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Invitation impossible.");
      }
      toast.success("Invitation envoyée.");
      setEmail("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => !locked && setOpen(true)}
        disabled={locked}
        title={locked ? "Passe en Pro pour inviter des membres" : undefined}
        className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-accent px-3.5 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {locked ? <Lock className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
        Inviter
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/40 px-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-[14px] border border-line bg-surface shadow-xl"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-[15px] font-semibold">Inviter un membre</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>

            <form onSubmit={submit} className="space-y-4 px-5 py-4">
              <div>
                <label htmlFor="invite-email" className="mb-2 block text-[13px] font-medium text-ink-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="invite-email"
                    type="email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@exemple.com"
                    className="input-base pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-medium text-ink-2">Rôle</label>
                <div className="grid grid-cols-2 gap-2">
                  <RolePill checked={role === "member"} label="Membre" onClick={() => setRole("member")} />
                  <RolePill checked={role === "admin"} label="Admin" onClick={() => setRole("admin")} />
                </div>
                <p className="mt-1.5 text-[11.5px] text-muted">
                  Les admins peuvent inviter et supprimer d&apos;autres membres.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 items-center rounded-[9px] border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 transition hover:border-line-2"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-primary h-9 px-4 text-[13px] disabled:opacity-50"
                >
                  {pending ? "Envoi…" : "Envoyer l'invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function RolePill({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex h-9 items-center justify-center rounded-[9px] border text-[13px] font-medium transition " +
        (checked
          ? "border-accent bg-accent-soft text-accent-ink"
          : "border-line bg-surface text-ink-2 hover:border-line-2")
      }
    >
      {label}
    </button>
  );
}
