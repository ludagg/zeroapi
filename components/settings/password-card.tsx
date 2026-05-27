"use client";

import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { SettingsCard } from "./profile-card";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(10, "Au moins 10 caractères"),
    confirm: z.string().min(1, "Confirme ton mot de passe"),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ["confirm"],
    message: "Les mots de passe ne correspondent pas",
  });

type Values = z.infer<typeof schema>;

export function PasswordCard() {
  const [submitting, setSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Mot de passe incorrect.");
      }
      toast.success("Mot de passe mis à jour.");
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réessaie dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsCard
      title="Mot de passe"
      subtitle="Au moins 10 caractères. Évite les mots de passe que tu utilises ailleurs."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <PwdField
          id="settings-pwd-current"
          label="Mot de passe actuel"
          show={showCurrent}
          onToggle={() => setShowCurrent((s) => !s)}
          error={errors.currentPassword?.message}
          register={register("currentPassword")}
          autoComplete="current-password"
        />
        <PwdField
          id="settings-pwd-new"
          label="Nouveau mot de passe"
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
          error={errors.newPassword?.message}
          register={register("newPassword")}
          autoComplete="new-password"
        />
        <PwdField
          id="settings-pwd-confirm"
          label="Confirmation"
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
          error={errors.confirm?.message}
          register={register("confirm")}
          autoComplete="new-password"
          hideToggle
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary h-9 px-4 text-[13px] disabled:opacity-50"
          >
            {submitting ? "Mise à jour…" : "Mettre à jour"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}

function PwdField({
  id,
  label,
  show,
  onToggle,
  error,
  register,
  autoComplete,
  hideToggle,
}: {
  id: string;
  label: string;
  show: boolean;
  onToggle: () => void;
  error: string | undefined;
  register: UseFormRegisterReturn;
  autoComplete: string;
  hideToggle?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••••"
          className={"input-base pl-10 " + (hideToggle ? "" : "pr-11")}
          {...register}
        />
        {!hideToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
    </div>
  );
}
