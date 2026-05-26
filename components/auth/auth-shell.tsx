import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  children,
  panel,
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative flex min-h-screen flex-col bg-bg px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="brand-mark h-[26px] w-[26px] text-[13px]">
              <span>0</span>
            </span>
            <span>
              Zero<span className="font-medium not-italic text-muted">API</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              aria-label="Retour au site"
              className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-2 text-[13px] text-muted transition hover:bg-bg-2 hover:text-ink"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden sm:inline">Retour au site</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-8 sm:py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-muted sm:text-[12px]">
          <span>© 2026 ZeroAPI</span>
          <span>
            <Link href="/privacy" className="transition hover:text-ink">
              Confidentialité
            </Link>
            {" · "}
            <Link href="/terms" className="transition hover:text-ink">
              Conditions
            </Link>
          </span>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-[#0A0A0A] p-7 text-[#F5F6F2] lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, #000 30%, transparent 80%)",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, #000 30%, transparent 80%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-[120px] -top-[120px] h-[480px] w-[480px] opacity-60"
          style={{
            background: "radial-gradient(circle, var(--accent-glow), transparent 60%)",
          }}
        />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-[520px] flex-col">
          <div className="flex items-center justify-end font-mono text-[11px] uppercase tracking-[0.08em] text-[#8C8F87]">
            <span className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
                style={{ boxShadow: "0 0 0 4px rgba(16,240,131,.18)" }}
              />
              Tous les systèmes opérationnels
            </span>
          </div>

          <div className="flex flex-1 items-center py-8">{panel}</div>

          <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.05em] text-[#5C5F58]">
            <div className="flex gap-[18px]">
              <span>
                <b className="font-medium text-[#F5F6F2]">14 200+</b> APIs générées
              </span>
              <span>
                <b className="font-medium text-[#F5F6F2]">99,9 %</b> uptime
              </span>
            </div>
            <span>v2.4 · Dakar</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
