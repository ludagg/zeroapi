"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signUp } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function scorePwd(v: string): number {
  let s = 0;
  if (v.length >= 8) s++;
  if (v.length >= 12) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
  return Math.min(s, 4);
}

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pwd, setPwd] = useState("");

  const strength = useMemo(() => (pwd ? scorePwd(pwd) : 0), [pwd]);

  const strengthLevels = t.raw("register.strengthLevels") as string[];

  const schema = z.object({
    name: z.string().min(2, t("register.nameMinLength")),
    email: z.string().email(t("shared.emailInvalid")),
    password: z.string().min(10, t("shared.passwordMinLength")),
    terms: z.literal(true, {
      errorMap: () => ({ message: t("register.termsRequired") }),
    }),
  });

  type Values = z.infer<typeof schema>;

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
      toast.error(error.message ?? t("register.errorFallback"));
      return;
    }
    toast.success(t("register.successToast"));
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-4">
        <label htmlFor="signup-name" className="mb-2 block text-[13px] font-medium text-ink-2">
          {t("register.nameLabel")}
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="signup-name"
            autoComplete="name"
            placeholder={t("register.namePlaceholder")}
            className="input-base pl-10"
            {...register("name")}
          />
        </div>
        {errors.name && <p className="mt-1.5 text-[12px] text-danger">{errors.name.message}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="signup-email" className="mb-2 block text-[13px] font-medium text-ink-2">
          {t("register.emailLabel")}
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder={t("register.emailPlaceholder")}
            className="input-base pl-10"
            {...register("email")}
          />
        </div>
        {errors.email && <p className="mt-1.5 text-[12px] text-danger">{errors.email.message}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="signup-pwd" className="mb-2 block text-[13px] font-medium text-ink-2">
          {t("shared.passwordLabel")}
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="signup-pwd"
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            placeholder={t("register.passwordPlaceholder")}
            className="input-base pl-10 pr-11"
            {...register("password", {
              onChange: (e) => setPwd(e.target.value),
            })}
          />
          <button
            type="button"
            onClick={() => setShowPwd((s) => !s)}
            aria-label={showPwd ? t("shared.passwordHide") : t("shared.passwordShow")}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[7px] text-muted transition hover:bg-bg-2 hover:text-ink"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

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
          {t("register.strengthLabel")} <b className="font-medium text-ink">{strengthLevels[strength]}</b>
        </p>
        {errors.password && (
          <p className="mt-1.5 text-[12px] text-danger">{errors.password.message}</p>
        )}
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
          {t("register.termsAccept")}{" "}
          <Link href="#" className="border-b border-line-2 text-ink hover:border-accent">
            {t("register.termsLink")}
          </Link>{" "}
          {t("register.termsAnd")}{" "}
          <Link href="#" className="border-b border-line-2 text-ink hover:border-accent">
            {t("register.privacyLink")}
          </Link>
        </span>
      </label>
      {errors.terms && <p className="mb-2 text-[12px] text-danger">{errors.terms.message}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary-accent group h-[46px] w-full disabled:opacity-70"
      >
        {submitting ? t("register.submitting") : t("register.submit")}
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
