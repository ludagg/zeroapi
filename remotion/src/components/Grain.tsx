import { AbsoluteFill } from "remotion";
import { COLORS } from "../theme";

/**
 * Subtle film-grain + vignette overlay for a premium, non-flat finish.
 * The grain is an inline SVG fractal-noise so it needs no asset files.
 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const noise =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
    );
  return (
    <>
      {/* vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 120% at 50% 42%, transparent 58%, rgba(10,10,10,0.06) 100%)`,
          pointerEvents: "none",
        }}
      />
      {/* grain */}
      <AbsoluteFill
        style={{
          backgroundImage: `url("${noise}")`,
          backgroundSize: "320px 320px",
          opacity,
          mixBlendMode: "multiply",
          pointerEvents: "none",
        }}
      />
      {/* faint accent floor glow to tie scenes together */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(80% 50% at 50% 115%, ${COLORS.accentGlow} 0%, transparent 60%)`,
          opacity: 0.25,
          pointerEvents: "none",
        }}
      />
    </>
  );
};
