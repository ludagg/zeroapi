"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Lock, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type JobEnvVariable = {
  name: string;
  category: "auto" | "required" | "optional";
  required: boolean;
  description: string | null;
  example: string | null;
  source: string;
  defined: boolean;
  managed: boolean;
  updatedAt: string | null;
};

const CATEGORY_LABEL: Record<JobEnvVariable["category"], string> = {
  auto: "Gérée par ZeroAPI",
  required: "À remplir",
  optional: "Optionnelle",
};

const SOURCE_LABEL: Record<string, string> = {
  database: "base de données",
  "auth.jwt": "auth · JWT",
  "auth.oauth": "auth · OAuth",
  "feature.fileUpload": "upload fichiers",
  explicit: "spec.env",
};

export function JobVariablesPanel({
  jobId,
  variables,
}: {
  jobId: string;
  variables: JobEnvVariable[];
}) {
  const missingRequired = useMemo(
    () => variables.filter((v) => v.category === "required" && !v.defined),
    [variables],
  );

  const customs = variables.filter((v) => v.category !== "auto");
  const auto = variables.filter((v) => v.category === "auto");

  return (
    <section className="space-y-4">
      <StatusBanner missingCount={missingRequired.length} missingNames={missingRequired.map((v) => v.name)} />

      {customs.length > 0 && (
        <VariablesCard
          jobId={jobId}
          title="Variables à configurer"
          subtitle="Renseigne tes secrets — ils sont chiffrés au repos avant d'être stockés."
          variables={customs}
        />
      )}

      {auto.length > 0 && (
        <VariablesCard
          jobId={jobId}
          title="Variables gérées par ZeroAPI"
          subtitle="Provisionnées automatiquement au déploiement. Lecture seule."
          variables={auto}
          readOnly
        />
      )}

      {variables.length === 0 && (
        <div className="rounded-[14px] border border-dashed border-line-2 bg-surface p-10 text-center text-[13px] text-muted">
          Cette API n&apos;a déclaré aucune variable d&apos;environnement.
        </div>
      )}
    </section>
  );
}

function StatusBanner({
  missingCount,
  missingNames,
}: {
  missingCount: number;
  missingNames: string[];
}) {
  if (missingCount === 0) {
    return (
      <div className="flex items-center gap-3 rounded-[12px] border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-accent-ink">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <span>Toutes les variables requises sont configurées.</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-warn/30 bg-warn-soft px-4 py-3 text-[13px] text-warn-ink">
      <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div className="min-w-0">
        <div className="font-medium">
          {missingCount === 1
            ? "1 variable requise manquante"
            : `${missingCount} variables requises manquantes`}
        </div>
        <div className="mt-0.5 font-mono text-[11.5px] text-muted">
          {missingNames.join(" · ")}
        </div>
      </div>
    </div>
  );
}

function VariablesCard({
  jobId,
  title,
  subtitle,
  variables,
  readOnly = false,
}: {
  jobId: string;
  title: string;
  subtitle: string;
  variables: JobEnvVariable[];
  readOnly?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <header className="border-b border-line px-5 py-3.5">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold">
          {title}
          <span className="rounded-full bg-bg-3 px-1.5 py-px font-mono text-[10.5px] text-muted">
            {variables.length}
          </span>
        </h3>
        <p className="mt-1 text-[12px] text-muted">{subtitle}</p>
      </header>
      <div>
        {variables.map((v) => (
          <VariableRow key={v.name} jobId={jobId} variable={v} readOnly={readOnly} />
        ))}
      </div>
    </div>
  );
}

function VariableRow({
  jobId,
  variable,
  readOnly,
}: {
  jobId: string;
  variable: JobEnvVariable;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();

  const locked = readOnly || variable.category === "auto";
  const needsAttention = variable.category === "required" && !variable.defined;

  async function save() {
    if (!draft) {
      toast.error("Renseigne une valeur.");
      return;
    }
    start(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/env`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: variable.name, value: draft }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Sauvegarde impossible.");
        toast.success(`${variable.name} mise à jour.`);
        setEditing(false);
        setDraft("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur inconnue.");
      }
    });
  }

  function remove() {
    if (
      !confirm(
        `Supprimer la valeur de ${variable.name} ? Le déploiement échouera tant qu'elle est absente.`,
      )
    ) {
      return;
    }
    startDelete(async () => {
      try {
        const res = await fetch(
          `/api/jobs/${jobId}/env/${encodeURIComponent(variable.name)}`,
          { method: "DELETE" },
        );
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Suppression impossible.");
        toast.success(`${variable.name} supprimée.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur inconnue.");
      }
    });
  }

  return (
    <div
      className={cn(
        "border-t border-line px-5 py-3.5 first:border-t-0",
        needsAttention && "bg-warn-soft/40",
      )}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-mono text-[13px] font-medium">{variable.name}</span>
            {locked && (
              <span
                title="Gérée par ZeroAPI"
                className="inline-flex items-center gap-1 rounded-[4px] border border-line bg-bg-2 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.04em] text-muted"
              >
                <Lock className="h-2 w-2" />
                auto
              </span>
            )}
            {needsAttention && (
              <span className="inline-flex items-center rounded-[4px] bg-warn px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.04em] text-warn-ink">
                requis
              </span>
            )}
            {!variable.required && variable.category === "optional" && (
              <span className="inline-flex items-center rounded-[4px] border border-line px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.04em] text-muted">
                optionnelle
              </span>
            )}
          </div>
          {variable.description && (
            <p className="mt-1 text-[12px] text-muted">{variable.description}</p>
          )}
          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-2">
            {CATEGORY_LABEL[variable.category]} · {SOURCE_LABEL[variable.source] ?? variable.source}
          </p>
        </div>

        <div className="min-w-0 font-mono text-[12px] text-ink-2">
          {variable.category === "auto" ? (
            <span className="text-muted">🔒 injectée au déploiement</span>
          ) : variable.defined ? (
            <span className="inline-flex items-center gap-2">
              <span>{showValue ? "(valeur masquée par sécurité)" : "••••••••••••"}</span>
              <button
                type="button"
                onClick={() => setShowValue((s) => !s)}
                aria-label={showValue ? "Masquer" : "Afficher"}
                className="grid h-6 w-6 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
              >
                {showValue ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </span>
          ) : (
            <span className="text-muted">non définie</span>
          )}
          {variable.example && !variable.defined && !editing && (
            <div className="mt-0.5 text-[10.5px] text-muted-2">
              ex&nbsp;: {variable.example}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!locked && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing((e) => !e);
                  setDraft("");
                }}
                className="rounded-[7px] border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-2 transition hover:border-line-2"
              >
                {editing ? "Annuler" : variable.defined ? "Modifier" : "Définir"}
              </button>
              {variable.defined && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={deleting}
                  aria-label="Supprimer"
                  className="grid h-8 w-8 place-items-center rounded-[7px] text-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {editing && !locked && (
        <div className="mt-3 rounded-[10px] border border-line bg-bg-2 p-3">
          <div className="flex items-center gap-2">
            <input
              type={showValue ? "text" : "password"}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              placeholder={variable.example ?? "valeur du secret"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="input-base h-10 flex-1 font-mono text-[13px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void save();
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowValue((s) => !s)}
              aria-label={showValue ? "Masquer" : "Afficher"}
              className="grid h-9 w-9 place-items-center rounded-[7px] border border-line bg-surface text-muted transition hover:text-ink"
            >
              {showValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              disabled={pending || !draft}
              onClick={save}
              className="inline-flex h-9 items-center justify-center rounded-[8px] bg-ink px-4 text-[13px] font-medium text-bg transition disabled:opacity-50"
            >
              {pending ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
