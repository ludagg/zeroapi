"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";
import { saveRouting } from "@/app/(admin)/admin/settings/actions";
import type { ProviderId } from "@/lib/ai-providers";
import type { RoutingTask } from "@/lib/llm-routing-config";

type Cell = { current: ProviderId | null; fallback: ProviderId };
type Matrix = Record<Plan, Record<RoutingTask, Cell>>;

const TASK_LABEL: Record<RoutingTask, string> = {
  conversation: "Conversation",
  spec_generation: "Génération de spec",
};

export function RoutingMatrix({
  matrix,
  plans,
  tasks,
  providers,
}: {
  matrix: Matrix;
  plans: Plan[];
  tasks: RoutingTask[];
  providers: Array<{ id: ProviderId; label: string }>;
}) {
  const [state, setState] = useState<Record<string, ProviderId>>(() => {
    const init: Record<string, ProviderId> = {};
    for (const plan of plans) {
      for (const task of tasks) {
        init[`${plan}:${task}`] = matrix[plan][task].current ?? matrix[plan][task].fallback;
      }
    }
    return init;
  });
  const [pending, start] = useTransition();

  function update(plan: Plan, task: RoutingTask, provider: ProviderId) {
    setState((s) => ({ ...s, [`${plan}:${task}`]: provider }));
  }

  function onSave() {
    if (providers.length === 0) {
      toast.error("Active au moins un provider dans AI Providers avant de sauvegarder.");
      return;
    }
    start(async () => {
      try {
        const entries: Array<{ plan: Plan; task: RoutingTask; provider: ProviderId }> = [];
        for (const plan of plans) {
          for (const task of tasks) {
            entries.push({ plan, task, provider: state[`${plan}:${task}`] });
          }
        }
        await saveRouting({ entries });
        toast.success("Matrice de routage sauvegardée.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sauvegarde impossible.");
      }
    });
  }

  if (providers.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-warn/40 bg-warn-soft p-5">
        <p className="text-[14px] font-medium text-warn-ink">
          Aucun provider activé pour l&apos;instant.
        </p>
        <p className="mt-1 text-[13px] text-warn-ink/80">
          Configure et active au moins un provider depuis{" "}
          <a
            href="/admin/settings/ai-providers"
            className="font-medium underline underline-offset-2"
          >
            AI Providers
          </a>{" "}
          pour pouvoir construire la matrice de routage.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <table className="w-full text-[13.5px]">
          <thead className="bg-bg-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Plan</th>
              {tasks.map((task) => (
                <th key={task} className="px-4 py-3 text-left font-medium">
                  {TASK_LABEL[task] ?? task}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan} className="border-t border-line">
                <td className="px-4 py-3">
                  <span className="rounded-[5px] bg-bg-2 px-1.5 py-0.5 font-mono text-[11px] font-medium">
                    {plan}
                  </span>
                </td>
                {tasks.map((task) => {
                  const key = `${plan}:${task}`;
                  const value = state[key];
                  const cell = matrix[plan][task];
                  const isOverridden = cell.current !== null;
                  return (
                    <td key={key} className="px-4 py-3">
                      <select
                        value={value}
                        onChange={(e) =>
                          update(plan, task, e.target.value as ProviderId)
                        }
                        className="input-base h-9 w-full max-w-[220px] cursor-pointer font-mono text-[12.5px]"
                      >
                        {providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 font-mono text-[10.5px] text-muted">
                        {isOverridden
                          ? "config DB"
                          : `défaut : ${cell.fallback}`}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] text-muted">
          Cache de routage : <b className="font-medium text-ink">5 min</b> · invalidé
          automatiquement à la sauvegarde.
        </p>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[14px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)] disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder la matrice
        </button>
      </div>
    </>
  );
}
