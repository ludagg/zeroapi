"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2, "Nom trop court"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(10, "Au moins 10 caractères"),
  terms: z.literal(true, {
    errorMap: () => ({ message: "Tu dois accepter les conditions" }),
  }),
});

type Values = z.infer<typeof schema>;

function scorePwd(v: string): number {
  let s = 0;
  if (v.length >= 8) s++;
  if (v.length >= 12) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
  return Math.min(s, 4);
}

const STRENGTH_LABELS = ["—", "faible", "moyen", "bon", "excellent"];

export function RegisterForm() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pwd, setPwd] = useState("");

  const strength = useMemo(() => (pwd ? scorePwd(pwd) : 0), [pwd]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    const { error } = await signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      callbackURL: "/dashboard",
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message ?? "Création impossible.");
      return;
    }
    toast.success("Compte créé. On t'envoie un code de vérification.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-4">
        <FormField
          label="Nom complet"
          autoComplete="name"
          placeholder="Aminata Diallo"
          icon={<User />}
          error={errors.name?.message}
          {...register("name")}
        />
      </div>

      <div className="mb-4">
        <FormField
          label="Adresse email professionnelle"
          type="email"
          autoComplete="email"
          placeholder="aminata@startup.ci"
          icon={<Mail />}
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <div className="mb-4">
        <FormField
          label="Mot de passe"
          type={showPwd ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Au moins 10 caractères"
          icon={<Lock />}
          error={errors.password?.message}
          trailing={
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? "Masquer" : "Afficher"}
              className="grid h-8 w-8 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register("password", {
            onChange: (e) => setPwd(e.target.value),
          })}
        />

        <div className="mt-2.5 flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn(
                "h-[3px] flex-1 rounded-[2px] bg-line transition-colors",
                strength >= i && strength === 1 && "bg-danger",
                strength >= i && strength === 2 && "bg-[#F5A524]",
                strength >= i && strength >= 3 && "bg-accent",
              )}
            />
          ))}
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-muted">
          Force : <b className="font-medium text-ink">{STRENGTH_LABELS[strength]}</b>
        </p>
      </div>

      <label className="my-1 mb-5 flex cursor-pointer select-none items-start gap-2.5 text-[13.5px] text-ink-2">
        <input type="checkbox" className="peer sr-only" {...register("terms")} />
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
        <span>
          J&apos;accepte les{" "}
          <Link href="#" className="border-b border-line-2 text-ink hover:border-accent">
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="#" className="border-b border-line-2 text-ink hover:border-accent">
            politique de confidentialité
          </Link>
        </span>
      </label>
      {errors.terms && <p className="mb-2 text-[12px] text-danger">{errors.terms.message}</p>}

      <Button type="submit" variant="accent" disabled={submitting} className="group w-full">
        {submitting ? "Création…" : "Créer mon compte"}
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </Button>
    </form>
  );
}
