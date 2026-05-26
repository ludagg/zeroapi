import Link from "next/link";
import { ArrowRight, ChevronDown, Zap } from "lucide-react";

export function GenerateStrip() {
  return (
    <div className="relative mb-7 flex flex-wrap items-center gap-4 overflow-hidden rounded-[14px] bg-ink px-5 py-4 text-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] -top-[60%] h-[320px] w-[320px] opacity-90"
        style={{
          background: "radial-gradient(circle, var(--accent-glow), transparent 60%)",
        }}
      />
      <div className="relative z-10 grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-[10px] bg-accent text-accent-ink">
        <Zap className="h-5 w-5" strokeWidth={2.4} />
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="font-serif text-[22px] leading-tight">
          Décris ta prochaine <em className="italic">API</em>.
        </div>
        <div className="mt-0.5 text-[13px] text-white/65">
          Génération asynchrone · ferme l&apos;onglet, on te prévient quand c&apos;est prêt.
        </div>
      </div>
      <div className="relative z-10 flex gap-2">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-white/[0.16] bg-white/[0.08] px-3.5 text-[13px] font-medium text-bg transition hover:bg-white/[0.14]"
        >
          Templates
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <Link
          href="/generate"
          className="inline-flex h-10 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-medium text-accent-ink transition hover:-translate-y-px hover:shadow-[0_6px_18px_var(--accent-glow)]"
        >
          Démarrer
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
