"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Lock, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type VarCategory = "auto" | "required" | "optional";

interface ApiVariable {
  name: string;
  required: boolean;
  description?: string;
  example?: string;
  category: VarCategory;
  source: string;
  defined: boolean;
  updatedAt: string | null;
}

interface ApiReadiness {
  ready: boolean;
  missingRequired: string[];
  setRequired: string[];
  autoVars: string[];
}

interface ApiResponse {
  variables: ApiVariable[];
  readiness: ApiReadiness;
}

const CATEGORY_ORDER: Record<VarCategory, number> = { required: 0, optional: 1, auto: 2 };

const PILL_BY_CATEGORY: Record<VarCategory, { label: string; className: string }> = {
  auto: { label: "🔒 Gérée par ZeroAPI", className: "bg-bg-2 text-muted" },
  required: { label: "À remplir", className: "bg-warn-soft text-warn-ink" },
  optional: { label: "Optionnelle", className: "bg-bg-3 text-muted" },
};

export function VariablesPanel({ jobId }: { jobId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await fetch(`/api/jobs/${jobId}/env`, { cache: "no-store" });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(text || `HTTP ${r.status}`);
      }
      const json = (await r.json()) as ApiResponse;
      json.variables.sort((a, b) => {
        const c = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
        if (c !== 0) return c;
        return a.name.localeCompare(b.name);
      });
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (loading) {
    return (
      <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-[13px] text-muted">
        Chargement des variables…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-[14px] border border-danger/30 bg-danger-soft p-4 text-[13px] text-danger">
        {error ?? "Réponse vide."}
      </div>
    );
  }

  const { variables, readiness } = data;
  const customs = variables.filter((v) => v.category !== "auto");
  const autos = variables.filter((v) => v.category === "auto");

  return (
    <div className="space-y-5">
      <ReadinessBanner readiness={readiness} />

      <section className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <header className="border-b border-line px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[14px] font-semibold">Variables requises par l&apos;API</h2>
            <span className="rounded-full bg-bg-3 px-1.5 py-px font-mono text-[10.5px] font-medium text-muted">
              {customs.length}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-muted">
            Valeurs chiffrées au repos (AES-256-GCM) — jamais renvoyées en clair, même au propriétaire.
          </p>
        </header>
        {customs.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted">
            Cette API ne déclare aucune variable personnalisée.
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-line bg-bg-2 text-left font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted">
              <tr>
                <th className="px-4 py-2 font-normal">Variable</th>
                <th className="px-4 py-2 font-normal">Statut</th>
                <th className="px-4 py-2 font-normal">Valeur</th>
                <th className="px-4 py-2 font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {customs.map((v) => (
                <VarRow key={v.name} jobId={jobId} v={v} onChanged={refresh} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {autos.length > 0 && (
        <section className="overflow-hidden rounded-[14px] border border-line bg-surface">
          <header className="border-b border-line px-4 py-3">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold">
              <Lock className="h-3.5 w-3.5 text-accent" />
              Variables gérées par ZeroAPI
              <span className="rounded-full bg-bg-3 px-1.5 py-px font-mono text-[10.5px] font-medium text-muted">
                {autos.length}
              </span>
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Provisionnées et injectées automatiquement au déploiement — pas d&apos;intervention nécessaire.
            </p>
          </header>
          <ul>
            {autos.map((v) => (
              <li
                key={v.name}
                className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 first:border-t-0"
              >
                <div className="min-w-0">
                  <div className="font-mono text-[12.5px] font-medium">{v.name}</div>
                  {v.description && (
                    <div className="mt-0.5 text-[12px] text-muted">{v.description}</div>
                  )}
                </div>
                <span className="rounded-[5px] bg-bg-2 px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
                  🔒 auto
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReadinessBanner({ readiness }: { readiness: ApiReadiness }) {
  const missing = readiness.missingRequired.length;
  if (readiness.ready) {
    return (
      <div className="flex items-start gap-2.5 rounded-[12px] border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-accent-ink">
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <div className="font-medium">Toutes les variables requises sont configurées.</div>
          <div className="mt-0.5 text-[12px] opacity-80">
            L&apos;API peut être déployée sur ZeroAPI Cloud.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5 rounded-[12px] border border-warn/40 bg-warn-soft px-4 py-3 text-[13px] text-warn-ink">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div className="min-w-0">
        <div className="font-medium">
          {missing} variable{missing > 1 ? "s" : ""} requise{missing > 1 ? "s" : ""} manquante
          {missing > 1 ? "s" : ""}
        </div>
        <div className="mt-1 font-mono text-[11.5px] opacity-80">
          {readiness.missingRequired.join(", ")}
        </div>
        <div className="mt-1 text-[12px] opacity-80">
          Renseigne-les ci-dessous pour pouvoir déployer.
        </div>
      </div>
    </div>
  );
}

function VarRow({
  jobId,
  v,
  onChanged,
}: {
  jobId: string;
  v: ApiVariable;
  onChanged: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  const pill = PILL_BY_CATEGORY[v.category];
  const isMissing = v.required && !v.defined;

  function onSave() {
    if (value.length === 0) {
      toast.error("Valeur vide.");
      return;
    }
    startSave(async () => {
      try {
        const r = await fetch(`/api/jobs/${jobId}/env`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: v.name, value }),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        setValue("");
        setEditing(false);
        setReveal(false);
        toast.success(`${v.name} enregistrée.`);
        await onChanged();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
      }
    });
  }

  function onDelete() {
    if (!confirm(`Supprimer la valeur de ${v.name} ?`)) return;
    startDelete(async () => {
      try {
        const r = await fetch(
          `/api/jobs/${jobId}/env/${encodeURIComponent(v.name)}`,
          { method: "DELETE" },
        );
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        toast.success(`${v.name} supprimée.`);
        await onChanged();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Suppression impossible.");
      }
    });
  }

  return (
    <tr className="border-t border-line align-top">
      <td className="px-4 py-3">
        <div className="font-mono text-[12.5px] font-medium">{v.name}</div>
        {v.description && (
          <div className="mt-0.5 max-w-[420px] text-[12px] text-muted">{v.description}</div>
        )}
        {v.example && (
          <div className="mt-1 font-mono text-[11px] text-muted-2">
            ex: <span className="text-muted">{v.example}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 font-mono text-[10.5px]",
            pill.className,
          )}
        >
          {pill.label}
        </span>
        {isMissing && (
          <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10.5px] text-warn-ink">
            <AlertTriangle className="h-3 w-3" />
            non définie
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {!editing ? (
          <span className="font-mono text-[12px] text-muted">
            {v.defined ? "•••••••• (définie)" : "—"}
          </span>
        ) : (
          <div className="relative w-full max-w-[320px]">
            <input
              type={reveal ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={v.example ?? "valeur"}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              className="input-base h-9 w-full pr-10 font-mono text-[12.5px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSave();
                } else if (e.key === "Escape") {
                  setEditing(false);
                  setValue("");
                  setReveal(false);
                }
              }}
            />
            <button
              type="button"
              aria-label={reveal ? "Masquer" : "Afficher"}
              onClick={() => setReveal((s) => !s)}
              className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-[5px] text-muted transition hover:bg-bg-2 hover:text-ink"
            >
              {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {!editing ? (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-[7px] border border-line bg-surface px-2 py-1 text-[11.5px] font-medium text-ink-2 transition hover:border-line-2"
            >
              <Pencil className="h-3 w-3" />
              {v.defined ? "Modifier" : "Définir"}
            </button>
            {v.defined && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                aria-label="Supprimer"
                className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={onSave}
              disabled={saving || value.length === 0}
              className="inline-flex h-7 items-center gap-1 rounded-[7px] bg-ink px-2.5 text-[11.5px] font-medium text-bg transition hover:-translate-y-px disabled:opacity-50"
            >
              {saving ? "…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setValue("");
                setReveal(false);
              }}
              aria-label="Annuler"
              className="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
