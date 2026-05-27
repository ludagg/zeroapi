import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPanel } from "@/components/auth/auth-panels";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = {
  title: "ZeroAPI — Nouveau mot de passe",
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";

  return (
    <AuthShell panel={<ForgotPanel />}>
      <div className="relative mb-6 grid h-16 w-16 place-items-center rounded-[16px] border border-line bg-accent-soft">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-[20px] border border-accent opacity-25"
        />
        <Lock className="h-7 w-7 text-accent-ink" strokeWidth={2} />
      </div>

      <div className="eyebrow mb-4">
        <span className="dot" />
        Réinitialisation
      </div>
      <h1 className="mb-3.5 font-serif text-[clamp(36px,4.6vw,52px)] leading-none tracking-[-0.01em]">
        Nouveau <em className="italic">mot de passe</em>.
      </h1>
      <p className="mb-7 text-[15px] text-muted">
        Choisis un mot de passe d&apos;au moins 10 caractères. Ne le partage avec personne.
      </p>

      {token ? (
        <ResetForm token={token} />
      ) : (
        <div className="rounded-[12px] border border-danger/30 bg-danger-soft px-4 py-3.5 text-[13px] text-danger">
          Lien invalide ou expiré. Demande un nouveau lien depuis la{" "}
          <Link
            href="/forgot-password"
            className="underline decoration-danger/50 underline-offset-2 hover:decoration-danger"
          >
            page de récupération
          </Link>
          .
        </div>
      )}

      <p className="mt-6 text-center text-[14px] text-muted">
        <Link
          href="/login"
          className="border-b border-accent font-medium text-ink hover:bg-accent-soft"
        >
          Retour à la connexion
        </Link>
      </p>
    </AuthShell>
  );
}
