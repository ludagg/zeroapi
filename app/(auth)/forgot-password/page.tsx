import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPanel } from "@/components/auth/auth-panels";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = {
  title: "ZeroAPI — Mot de passe oublié",
};

export default function ForgotPasswordPage() {
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
        Récupération
      </div>
      <h1 className="mb-3.5 font-serif text-[clamp(36px,4.6vw,52px)] leading-none tracking-[-0.01em]">
        Pas de <em className="italic">panique</em>.
      </h1>
      <p className="mb-7 text-[15px] text-muted">
        Donne-nous ton email — on t&apos;envoie un lien sécurisé pour réinitialiser ton mot de passe.
        Valable 30 minutes.
      </p>

      <ForgotForm />

      <p className="mt-6 text-center text-[14px] text-muted">
        Tu te souviens ?{" "}
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
