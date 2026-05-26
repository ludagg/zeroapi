import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="brand-mark h-[26px] w-[26px] text-[13px]">
            <span>0</span>
          </span>
          <span className="font-semibold">
            Zero<span className="font-medium not-italic text-muted">API</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-[9px] px-3 py-2 text-sm text-muted transition hover:bg-bg-2 hover:text-ink"
          >
            Connexion
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="eyebrow mb-5">
          <span className="dot" />
          Sprint 1 · setup
        </span>
        <h1 className="font-serif text-[clamp(48px,7vw,84px)] leading-[1.02] tracking-[-0.01em]">
          Génère ton <em>backend</em> en parlant français.
        </h1>
        <p className="mt-5 max-w-xl text-[16px] text-muted">
          Décris ton API. ZeroAPI génère le code, les tests, la doc OpenAPI et le déploie. En 2
          minutes, ferme l&apos;onglet — on te prévient quand c&apos;est prêt.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="btn-primary-accent h-12 px-5">
            Créer mon compte
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-line bg-surface px-5 text-[15px] font-medium text-ink transition hover:-translate-y-px hover:border-line-2"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>
      </section>

      <footer className="px-8 py-6 text-center font-mono text-[12px] text-muted">
        © 2026 ZeroAPI · Dakar · v0.1
      </footer>
    </main>
  );
}
