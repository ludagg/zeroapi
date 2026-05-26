"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "@/components/landing/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

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
          <a href="#produit">Produit</a>
          <a href="#usages">Cas d&apos;usage</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav-right">
          <ThemeToggle />
          <Link href="/login" className="btn btn-ghost hide-mobile">
            Se connecter
          </Link>
          <Link href="/register" className="btn btn-accent">
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
        </div>
      </div>
    </header>
  );
}
