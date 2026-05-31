"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
  remember: z.boolean().default(true),
});

type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { remember: true },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.remember,
      callbackURL: "/dashboard",
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Identifiants incorrects.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <div className="mb-4">
        <FormField
          label="Mot de passe"
          type={showPwd ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••••"
          icon={<Lock />}
          error={errors.password?.message}
          labelAction={
            <Link
              href="/forgot-password"
              className="font-mono text-[12px] text-muted transition hover:text-ink"
            >
              Oublié&nbsp;?
            </Link>
          }
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

      <label className="my-1 mb-5 flex cursor-pointer select-none items-start gap-2.5 text-[13.5px] text-ink-2">
        <input type="checkbox" className="peer sr-only" defaultChecked {...register("remember")} />
        <span className="mt-px grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-[5px] border-[1.5px] border-line-2 bg-surface transition peer-checked:border-accent peer-checked:bg-accent">
          <svg
            viewBox="0 0 24 24"
            className="h-3 w-3 text-accent-ink opacity-0 transition peer-checked:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        <span>Garder ma session active sur cet appareil</span>
      </label>

      <Button type="submit" disabled={submitting} className="group w-full">
        {submitting ? "Connexion…" : "Se connecter"}
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </Button>
    </form>
  );
}
