"use client";

import { useEffect, useState } from "react";

// Module-level flag : persiste à travers les remontages / navigations SPA d'un
// même chargement de page, et se réinitialise au rechargement complet. Garantit
// que l'animation d'intro (classe `intro-on`) ne se joue qu'une seule fois.
let introPlayed = false;

export function IntroOnce({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [play] = useState(() => !introPlayed);

  useEffect(() => {
    introPlayed = true;
  }, []);

  return <div className={(play ? "intro-on " : "") + className}>{children}</div>;
}
