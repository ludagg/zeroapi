import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterPanel } from "@/components/auth/auth-panels";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthDivider, OAuthRow } from "@/components/auth/oauth-row";

export const metadata: Metadata = {
  title: "ZeroAPI — Inscription",
};

export default function RegisterPage() {
  return (
    <AuthShell panel={<RegisterPanel />}>
      <div className="eyebrow mb-4">
        <span className="dot" />
        Inscription
      </div>
      <h1 className="mb-3.5 font-serif text-[clamp(36px,4.6vw,52px)] leading-none tracking-[-0.01em]">
        Crée ton <em className="italic">compte</em>.
      </h1>
      <p className="mb-7 text-[15px] text-muted">
        Déjà inscrit·e ?{" "}
        <Link
          href="/login"
          className="border-b border-accent font-medium text-ink hover:bg-accent-soft"
        >
          Connecte-toi
        </Link>
        . Aucune carte requise.
      </p>

      <OAuthRow callbackURL="/dashboard" />
      <AuthDivider />
      <RegisterForm />
    </AuthShell>
  );
}
