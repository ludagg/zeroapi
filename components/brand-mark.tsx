/**
 * ZeroAPI logo mark — "Endpoint": le « 0 » dessiné en anneau avec un nœud accent.
 * Les couleurs utilisent les tokens de thème (var(--ink) / --bg / --accent),
 * donc le mark s'inverse automatiquement entre les thèmes clair et sombre.
 */
export function BrandMark({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="ZeroAPI"
    >
      <rect width="32" height="32" rx="8" style={{ fill: "var(--ink)" }} />
      <circle
        cx="16"
        cy="16"
        r="9.2"
        fill="none"
        strokeWidth="3"
        style={{ stroke: "var(--bg)" }}
      />
      <circle
        cx="22.5"
        cy="9.5"
        r="3.6"
        strokeWidth="1.4"
        style={{ fill: "var(--accent)", stroke: "var(--ink)" }}
      />
    </svg>
  );
}
