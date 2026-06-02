/**
 * Indicateur « l'IA réfléchit ».
 *
 * Remplace les trois points animés par un libellé explicite (« Réflexion… »)
 * qui scintille, accompagné d'un point vert qui pulse. C'est plus clair pour
 * l'utilisateur : on comprend que l'assistant pense, pas que l'app a planté.
 */
export function ThinkingIndicator({ label = "Réflexion" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5" role="status" aria-live="polite">
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      <span className="text-shimmer text-[13.5px] font-medium tracking-tight">
        {label}
        <span className="ml-px">…</span>
      </span>
    </div>
  );
}
