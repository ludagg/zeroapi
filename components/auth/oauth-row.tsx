"use client";

import { useState } from "react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.13c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55 4.57-1.52 7.85-5.83 7.85-10.91C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function OAuthRow({ callbackURL = "/dashboard" }: { callbackURL?: string }) {
  const [loading, setLoading] = useState<"google" | "github" | null>(null);

  async function handle(provider: "google" | "github") {
    setLoading(provider);
    try {
      await signIn.social({ provider, callbackURL });
    } catch (err) {
      toast.error("Connexion impossible. Réessaie dans un instant.");
      setLoading(null);
    }
  }

  const base =
    "inline-flex h-[42px] items-center justify-center gap-2 rounded-[10px] border border-line bg-surface text-[14px] font-medium text-ink transition hover:-translate-y-px hover:border-line-2 hover:bg-bg-2 disabled:opacity-60";

  return (
    <div className="mb-6 grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={() => handle("google")}
        disabled={loading !== null}
        className={base}
      >
        <GoogleIcon />
        {loading === "google" ? "…" : "Google"}
      </button>
      <button
        type="button"
        onClick={() => handle("github")}
        disabled={loading !== null}
        className={base}
      >
        <GitHubIcon />
        {loading === "github" ? "…" : "GitHub"}
      </button>
    </div>
  );
}

export function AuthDivider({ children = "OU AVEC EMAIL" }: { children?: string }) {
  return (
    <div className="mb-[22px] flex items-center gap-3 font-mono text-[11px] tracking-[0.1em] text-muted">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
