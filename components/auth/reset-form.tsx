"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const schema = z
  .object({
    password: z.string().min(10, "Au moins 10 caractères"),
    confirm: z.string().min(1, "Confirme ton mot de passe"),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Les mots de passe ne correspondent pas",
  });

type Values = z.infer<typeof schema>;

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Lien invalide ou expiré.");
      return;
    }
    toast.success("Mot de passe mis à jour.");
    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-4">
        <label htmlFor="reset-pwd" className="mb-2 block text-[13px] font-medium text-ink-2">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="reset-pwd"
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••••"
            className="input-base pl-10 pr-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1.5 text-[12px] text-danger">{errors.password.message}</p>
        )}
      </div>

      <div className="mb-5">
        <label htmlFor="reset-confirm" className="mb-2 block text-[13px] font-medium text-ink-2">
          Confirmation
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="reset-confirm"
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••••"
            className="input-base pl-10"
            {...register("confirm")}
          />
        </div>
        {errors.confirm && (
          <p className="mt-1.5 text-[12px] text-danger">{errors.confirm.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary group h-[46px] w-full disabled:opacity-70"
      >
        {submitting ? "Mise à jour…" : "Mettre à jour"}
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
