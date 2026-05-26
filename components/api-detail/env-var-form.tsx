"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Plus } from "lucide-react";
import { toast } from "sonner";
import { upsertEnvVariable } from "@/app/(dashboard)/apis/[id]/settings/actions";

const schema = z.object({
  key: z
    .string()
    .min(1, "Clé requise")
    .max(64)
    .regex(/^[A-Z][A-Z0-9_]{0,63}$/, "MAJUSCULES_ET_UNDERSCORE uniquement"),
  value: z.string().min(1, "Valeur requise").max(8192),
});

type Values = z.infer<typeof schema>;

export function EnvVarForm({ jobId, defaultKey }: { jobId: string; defaultKey?: string }) {
  const [pending, start] = useTransition();
  const [showValue, setShowValue] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { key: defaultKey ?? "", value: "" },
  });

  function onSubmit(values: Values) {
    start(async () => {
      try {
        await upsertEnvVariable({ jobId, key: values.key, value: values.value });
        toast.success(defaultKey ? "Variable mise à jour." : "Variable ajoutée.");
        reset({ key: defaultKey ?? "", value: "" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action impossible.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-[200px_minmax(0,1fr)_auto]"
    >
      <div>
        <input
          type="text"
          placeholder="DATABASE_URL"
          autoComplete="off"
          spellCheck={false}
          readOnly={Boolean(defaultKey)}
          className="input-base h-10 font-mono text-[13px]"
          {...register("key")}
        />
        {errors.key && <p className="mt-1 text-[11.5px] text-danger">{errors.key.message}</p>}
      </div>

      <div className="relative">
        <input
          type={showValue ? "text" : "password"}
          placeholder={defaultKey ? "Nouvelle valeur" : "valeur du secret"}
          autoComplete="off"
          spellCheck={false}
          className="input-base h-10 pr-11 font-mono text-[13px]"
          {...register("value")}
        />
        <button
          type="button"
          aria-label={showValue ? "Masquer" : "Afficher"}
          onClick={() => setShowValue((s) => !s)}
          className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[6px] text-muted transition hover:bg-bg-2 hover:text-ink"
        >
          {showValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        {errors.value && <p className="mt-1 text-[11.5px] text-danger">{errors.value.message}</p>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-ink px-4 text-[13px] font-medium text-bg transition hover:-translate-y-px disabled:opacity-50"
      >
        {!defaultKey && <Plus className="h-3.5 w-3.5" />}
        {pending ? "…" : defaultKey ? "Mettre à jour" : "Ajouter"}
      </button>
    </form>
  );
}
