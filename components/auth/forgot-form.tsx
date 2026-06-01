"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";

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
        <FormField
          label="Adresse email"
          type="email"
          autoComplete="email"
          placeholder="aminata@exemple.ci"
          icon={<Mail />}
          disabled={sent}
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <Button
        type="submit"
        variant={sent ? "accent" : "primary"}
        disabled={submitting || sent}
        className="group w-full"
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
      </Button>
    </form>
  );
}
