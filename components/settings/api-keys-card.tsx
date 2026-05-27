"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Key, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsCard } from "@/components/settings/profile-card";
import { formatRelativeTime } from "@/lib/utils";

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export function ApiKeysCard({ initial }: { initial: ApiKeyRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ id: string; plaintext: string } | null>(null);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as {
        id?: string;
        plaintext?: string;
        error?: string;
      };
      if (!res.ok || !data.id || !data.plaintext) {
        throw new Error(data.error ?? "Création impossible.");
      }
      setRevealed({ id: data.id, plaintext: data.plaintext });
      setName("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Révoquer cette clé ? Les requêtes échoueront immédiatement.")) return;
    try {
      const res = await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Révocation impossible.");
      }
      toast.success("Clé révoquée.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    }
  }

  return (
    <SettingsCard
      title="Clés API personnelles"
      subtitle="Permettent d'appeler l'API ZeroAPI depuis tes scripts. Ne partage jamais une clé."
    >
      {revealed && (
        <div className="mb-4 overflow-hidden rounded-[10px] border border-accent/40 bg-accent-soft">
          <div className="border-b border-accent/30 px-3.5 py-2 text-[12px] font-semibold text-accent-ink">
            Clé créée — copie-la maintenant, elle ne sera plus jamais affichée.
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2.5">
            <code className="flex-1 truncate font-mono text-[12.5px] text-ink">
              {revealed.plaintext}
            </code>
            <CopyButton value={revealed.plaintext} />
            <button
              type="button"
              onClick={() => setRevealed(null)}
              className="text-[11.5px] font-medium text-muted hover:text-ink"
            >
              J&apos;ai copié
            </button>
          </div>
        </div>
      )}

      <form onSubmit={createKey} className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Key className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Production · CI"
            className="input-base pl-10"
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim() || creating}
          className="btn-primary h-9 px-4 text-[13px] disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {creating ? "Création…" : "Créer"}
        </button>
      </form>

      {initial.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line-2 bg-bg-2 px-4 py-6 text-center text-[12.5px] text-muted">
          Aucune clé pour l&apos;instant. Crée-en une pour appeler l&apos;API.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-line">
          {initial.map((k, i) => (
            <div
              key={k.id}
              className="grid grid-cols-[1fr_auto] items-center gap-3 px-3.5 py-3"
              style={i > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="truncate text-[13.5px] font-medium">{k.name}</span>
                  <code className="font-mono text-[11.5px] text-muted">
                    {k.keyPrefix}••••••••••••
                  </code>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted">
                  créée {formatRelativeTime(k.createdAt)}
                  {k.lastUsedAt
                    ? ` · dernière utilisation ${formatRelativeTime(k.lastUsedAt)}`
                    : " · jamais utilisée"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => revokeKey(k.id)}
                aria-label="Révoquer"
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 text-[12px] font-medium text-danger transition hover:border-danger/40"
              >
                <Trash2 className="h-3 w-3" />
                Révoquer
              </button>
            </div>
          ))}
        </div>
      )}
    </SettingsCard>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-line bg-surface px-2 text-[11.5px] font-medium text-ink-2 transition hover:border-line-2"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copié
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copier
        </>
      )}
    </button>
  );
}
