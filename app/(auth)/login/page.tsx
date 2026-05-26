import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginPanel } from "@/components/auth/auth-panels";
import { LoginForm } from "@/components/auth/login-form";
import { AuthDivider, OAuthRow } from "@/components/auth/oauth-row";

export const metadata: Metadata = {
  title: "ZeroAPI — Connexion",
};

export default function LoginPage() {
  return (
    <AuthShell panel={<LoginPanel />}>
      <div className="eyebrow mb-4">
        <span className="dot" />
        Connexion
      </div>
      <h1 className="mb-3.5 font-serif text-[clamp(36px,4.6vw,52px)] leading-none tracking-[-0.01em]">
        Bon <em className="italic">retour</em>.
      </h1>
      <p className="mb-7 text-[15px] text-muted">
        Pas encore de compte ?{" "}
        <Link
          href="/register"
          className="border-b border-accent font-medium text-ink hover:bg-accent-soft"
        >
          Crée-en un en 30 s
        </Link>
        .
      </p>

      <OAuthRow callbackURL="/dashboard" />
      <AuthDivider />
      <LoginForm />
    </AuthShell>
  );
}
