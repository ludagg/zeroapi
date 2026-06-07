import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPanel } from "@/components/auth/auth-panels";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = {
  title: "ZeroAPI — Mot de passe oublié",
};

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  return (
    <AuthShell panel={<ForgotPanel />}>
      <div className="relative mb-6 grid h-16 w-16 place-items-center rounded-[16px] border border-line bg-accent-soft">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-[20px] border border-accent opacity-25"
        />
        <Mail className="h-7 w-7 text-accent-ink" strokeWidth={2} />
      </div>

      <div className="eyebrow mb-4">
        <span className="dot" />
        {t("forgot.eyebrow")}
      </div>
      <h1 className="mb-3.5 font-serif text-[clamp(36px,4.6vw,52px)] leading-none tracking-[-0.01em]">
        {t("forgot.headingBefore")} <em className="italic">{t("forgot.headingEm")}</em>.
      </h1>
      <p className="mb-7 text-[15px] text-muted">
        {t("forgot.description")}
      </p>

      <ForgotForm />

      <p className="mt-6 text-center text-[14px] text-muted">
        {t("forgot.rememberCta")}{" "}
        <Link
          href="/login"
          className="border-b border-accent font-medium text-ink hover:bg-accent-soft"
        >
          {t("shared.backToLogin")}
        </Link>
      </p>
    </AuthShell>
  );
}
