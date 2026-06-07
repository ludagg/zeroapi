import Link from "next/link";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterPanel } from "@/components/auth/auth-panels";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthDivider, OAuthRow } from "@/components/auth/oauth-row";
import { oauthAvailable } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ZeroAPI — Inscription",
};

export default function RegisterPage() {
  const t = useTranslations("auth");
  const showOAuth = oauthAvailable.google || oauthAvailable.github;
  return (
    <AuthShell panel={<RegisterPanel />}>
      <div className="eyebrow mb-4">
        <span className="dot" />
        {t("register.eyebrow")}
      </div>
      <h1 className="mb-3.5 font-serif text-[clamp(36px,4.6vw,52px)] leading-none tracking-[-0.01em]">
        {t("register.headingBefore")} <em className="italic">{t("register.headingEm")}</em>.
      </h1>
      <p className="mb-7 text-[15px] text-muted">
        {t("register.alreadyRegistered")}{" "}
        <Link
          href="/login"
          className="border-b border-accent font-medium text-ink hover:bg-accent-soft"
        >
          {t("register.alreadyRegisteredCta")}
        </Link>
        . {t("register.noCard")}
      </p>

      {showOAuth && (
        <>
          <OAuthRow
            callbackURL="/dashboard"
            google={oauthAvailable.google}
            github={oauthAvailable.github}
          />
          <AuthDivider />
        </>
      )}
      <RegisterForm />
    </AuthShell>
  );
}
