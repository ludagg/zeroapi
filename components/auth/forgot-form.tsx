"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

const schema = z.object({ email: z.string().email("Adresse email invalide") });
type Values = z.infer<typeof schema>;

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Envoi impossible.");
      return;
    }
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-4">
        <label htmlFor="forgot-email" className="mb-2 block text-[13px] font-medium text-ink-2">
          Adresse email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="aminata@exemple.ci"
            className="input-base pl-10"
            disabled={sent}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="mt-1.5 text-[12px] text-danger">{errors.email.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting || sent}
        className={
          sent
            ? "btn-primary-accent h-[46px] w-full"
            : "btn-primary group h-[46px] w-full disabled:opacity-70"
        }
      >
        {sent ? (
          <>
            <Check className="h-4 w-4" strokeWidth={3} />
            Lien envoyé
          </>
        ) : submitting ? (
          "Envoi…"
        ) : (
          <>
            Envoyer le lien
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
