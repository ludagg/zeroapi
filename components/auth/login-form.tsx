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
        <label htmlFor="login-email" className="mb-2 block text-[13px] font-medium text-ink-2">
          Adresse email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="aminata@exemple.ci"
            className="input-base pl-10"
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="mt-1.5 text-[12px] text-danger">{errors.email.message}</p>
        )}
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="login-pwd" className="text-[13px] font-medium text-ink-2">
            Mot de passe
          </label>
          <Link href="/forgot-password" className="font-mono text-[12px] text-muted transition hover:text-ink">
            Oublié&nbsp;?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="login-pwd"
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
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

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary group h-[46px] w-full disabled:opacity-70"
      >
        {submitting ? "Connexion…" : "Se connecter"}
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
