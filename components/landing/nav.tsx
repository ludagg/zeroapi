"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Brand } from "@/components/landing/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileDrawer } from "@/components/ui/mobile-drawer";

const NAV_ITEMS = [
  { href: "#produit", label: "Produit" },
  { href: "#usages", label: "Cas d'usage" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="wrap nav-inner">
        <Brand href="/" />
        <nav className="nav-links" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="nav-right">
          <ThemeToggle className="nav-theme-toggle" />
          <Link href="/login" className="btn btn-ghost hide-mobile">
            Se connecter
          </Link>
          <Link href="/register" className="btn btn-accent hide-mobile">
            Commencer
            <svg
              className="arrow"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <button
            type="button"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            className="nav-burger"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <MobileDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        side="right"
        label="Menu principal"
        width={320}
        className="bg-bg"
      >
        <div className="flex h-full flex-col px-6 pb-6 pt-5">
          <div className="mb-8">
            <Brand href="/" />
          </div>
          <nav className="flex flex-col gap-1" aria-label="Navigation mobile">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-[10px] px-3 py-3 text-[16px] font-medium text-ink-2 transition hover:bg-bg-2 hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="my-6 h-px bg-line" />

          <div className="flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-12 items-center justify-center rounded-[10px] border border-line bg-surface text-[15px] font-medium text-ink transition hover:border-line-2"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-accent text-[15px] font-medium text-accent-ink transition"
              style={{ boxShadow: "0 6px 18px var(--accent-glow)" }}
            >
              Commencer
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          <div className="mt-auto pt-6 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            <div className="flex items-center justify-between">
              <span>Thème</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </MobileDrawer>
    </header>
  );
}
