"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Check, Eye, EyeOff, Loader2, Plug, Save, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  saveProvider,
  setProviderEnabled,
  testProvider,
} from "@/app/(admin)/admin/settings/actions";
import type { ProviderAdminView } from "@/lib/ai-providers";

const schema = z.object({
  apiKey: z.string().min(8, "Clé trop courte"),
  model: z.string().min(1, "Modèle requis"),
});
type Values = z.infer<typeof schema>;

type TestState =
  | { status: "idle" }
  | { status: "ok"; latencyMs: number; preview: string }
  | { status: "ko"; latencyMs: number; error: string };

const ICON_BG: Record<string, string> = {
  anthropic: "bg-[#D97757] text-white",
  mistral: "bg-[#FA520F] text-white",
  gemini: "bg-[#1F6FEB] text-white",
  groq: "bg-[#F55036] text-white",
};

const ICON: Record<string, string> = {
  anthropic: "A",
  mistral: "M",
  gemini: "G",
  groq: "Gq",
};

export function ProviderCard({ view }: { view: ProviderAdminView }) {
  const [saving, startSave] = useTransition();
  const [testing, setTesting] = useState(false);
  const [toggling, startToggle] = useTransition();
  const [testState, setTestState] = useState<TestState>({ status: "idle" });
  const [showKey, setShowKey] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isDirty },
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { apiKey: "", model: view.model },
  });

  function onSubmit(values: Values) {
    startSave(async () => {
      try {
        await saveProvider({
          provider: view.provider,
          apiKey: values.apiKey,
          model: values.model,
        });
        toast.success(`${view.label} sauvegardé.`);
        reset({ apiKey: "", model: values.model });
        setTestState({ status: "idle" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sauvegarde impossible.");
      }
    });
  }

  async function onTest() {
    const values = getValues();
    if (!values.apiKey || values.apiKey.length < 8) {
      toast.error("Saisis une clé API avant de tester.");
      return;
    }
    setTesting(true);
    setTestState({ status: "idle" });
    try {
      const res = await testProvider({
        provider: view.provider,
        apiKey: values.apiKey,
        model: values.model,
      });
      if (res.ok) {
        setTestState({ status: "ok", latencyMs: res.latencyMs, preview: res.preview });
      } else {
        setTestState({ status: "ko", latencyMs: res.latencyMs, error: res.error });
      }
    } catch (err) {
      setTestState({
        status: "ko",
        latencyMs: 0,
        error: err instanceof Error ? err.message : "Test impossible.",
      });
    } finally {
      setTesting(false);
    }
  }

  function onToggle() {
    startToggle(async () => {
      try {
        await setProviderEnabled({ provider: view.provider, enabled: !view.enabled });
        toast.success(view.enabled ? "Provider désactivé." : "Provider activé.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action impossible.");
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-[14px] border border-line bg-surface">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-9 w-9 flex-shrink-0 place-items-center rounded-[9px] font-mono text-[13px] font-semibold",
              ICON_BG[view.provider] ?? "bg-bg-2 text-ink",
            )}
          >
            {ICON[view.provider] ?? "?"}
          </span>
          <div>
            <h3 className="text-[14.5px] font-semibold">{view.label}</h3>
            <p className="mt-0.5 font-mono text-[11px] text-muted">
              {view.hasKey ? (
                <>
                  Clé : <span className="text-ink-2">{view.keyMask}</span>
                  {" · "}
                  source : <span className="text-ink-2">{view.source}</span>
                </>
              ) : (
                "Aucune clé enregistrée"
              )}
            </p>
          </div>
        </div>
        <StatusPill enabled={view.enabled} hasKey={view.hasKey} />
      </header>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 px-4 py-4">
        <div>
          <label className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
            Clé API
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder={view.hasKey ? "Laisse vide pour conserver" : "sk-…"}
              className="input-base h-10 pr-11 font-mono text-[13px]"
              {...register("apiKey")}
            />
            <button
              type="button"
              aria-label={showKey ? "Masquer" : "Afficher"}
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {errors.apiKey && (
            <p className="mt-1 text-[11.5px] text-danger">{errors.apiKey.message}</p>
          )}
          <p className="mt-1 font-mono text-[10.5px] text-muted">
            <a
              href={view.docs}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              Récupérer une clé →
            </a>
          </p>
        </div>

        <div>
          <label className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
            Modèle (défaut : <span className="text-ink-2">{view.defaultModel}</span>)
          </label>
          <input
            type="text"
            spellCheck={false}
            className="input-base h-10 font-mono text-[13px]"
            {...register("model")}
          />
          {errors.model && (
            <p className="mt-1 text-[11.5px] text-danger">{errors.model.message}</p>
          )}
        </div>

        {testState.status !== "idle" && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-[10px] border px-3 py-2.5 text-[12.5px]",
              testState.status === "ok"
                ? "border-accent/30 bg-accent-soft text-accent-ink"
                : "border-danger/30 bg-danger-soft text-danger",
            )}
          >
            {testState.status === "ok" ? (
              <>
                <Check className="mt-0.5 h-3.5 w-3.5" strokeWidth={3} />
                <div className="min-w-0">
                  <div className="font-medium">Connexion réussie · {testState.latencyMs} ms</div>
                  <div className="mt-0.5 truncate font-mono text-[11.5px] opacity-80">
                    {testState.preview}
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                <div className="min-w-0">
                  <div className="font-medium">Échec ({testState.latencyMs} ms)</div>
                  <div className="mt-0.5 truncate font-mono text-[11.5px] opacity-80">
                    {testState.error}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-line pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onTest}
              disabled={testing || saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-2 transition hover:border-line-2 disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {testing ? "Test…" : "Tester la connexion"}
            </button>
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-ink px-3 text-[12.5px] font-medium text-bg transition hover:-translate-y-px disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Sauvegarder
            </button>
          </div>
          <button
            type="button"
            onClick={onToggle}
            disabled={toggling || (!view.hasKey && !view.enabled)}
            title={
              !view.hasKey && !view.enabled
                ? "Sauvegarde une clé avant d'activer"
                : view.enabled
                  ? "Désactiver"
                  : "Activer"
            }
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-[9px] border px-3 text-[12.5px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
              view.enabled
                ? "border-line bg-surface text-ink-2 hover:border-line-2"
                : "border-accent bg-accent text-accent-ink hover:-translate-y-px",
            )}
          >
            <Plug className="h-3.5 w-3.5" />
            {view.enabled ? "Désactiver" : "Activer"}
          </button>
        </div>
      </form>
    </section>
  );
}

function StatusPill({ enabled, hasKey }: { enabled: boolean; hasKey: boolean }) {
  if (enabled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-accent-ink">
        <span
          className="h-1.5 w-1.5 rounded-full bg-accent"
          style={{ boxShadow: "0 0 0 3px var(--accent-glow)" }}
        />
        Connecté
      </span>
    );
  }
  if (!hasKey) {
    return (
      <span className="rounded-full border border-dashed border-line-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted">
        Non configuré
      </span>
    );
  }
  return (
    <span className="rounded-full bg-bg-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.04em] text-muted">
      Inactif
    </span>
  );
}
