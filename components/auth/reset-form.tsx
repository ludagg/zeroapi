"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";

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
        <FormField
          label="Nouveau mot de passe"
          type={showPwd ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••••"
          icon={<Lock />}
          error={errors.password?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="grid h-8 w-8 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register("password")}
        />
      </div>

      <div className="mb-5">
        <FormField
          label="Confirmation"
          type={showPwd ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••••"
          icon={<Lock />}
          error={errors.confirm?.message}
          {...register("confirm")}
        />
      </div>

      <Button type="submit" disabled={submitting} className="group w-full">
        {submitting ? "Mise à jour…" : "Mettre à jour"}
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </Button>
    </form>
  );
}
