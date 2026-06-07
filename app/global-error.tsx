"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/**
 * Catastrophic boundary for errors thrown in the root layout itself. It
 * replaces the entire document, so it ships its own <html>/<body> and uses
 * inline styles (globals.css and the i18n provider are not available here).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0a0a0a",
          color: "#ededed",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", margin: "0 0 12px" }}>
            Une erreur est survenue
          </h1>
          <p style={{ color: "#a1a1a1", margin: "0 0 8px" }}>
            Quelque chose s'est mal passé. Réessaie, ou reviens un peu plus tard.
          </p>
          <p style={{ color: "#a1a1a1", margin: "0 0 24px", fontSize: "13px" }}>
            Something went wrong. Please try again, or come back later.
          </p>
          {error.digest && (
            <p style={{ color: "#6b6b6b", fontFamily: "monospace", fontSize: "11px" }}>
              Référence: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "16px",
              padding: "8px 18px",
              borderRadius: "9px",
              border: "none",
              background: "#ededed",
              color: "#0a0a0a",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Réessayer / Try again
          </button>
        </div>
      </body>
    </html>
  );
}
