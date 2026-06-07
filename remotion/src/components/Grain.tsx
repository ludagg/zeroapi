import { AbsoluteFill, useCurrentFrame } from "remotion";

/**
 * Subtle film-grain + vignette overlay for a premium, non-flat finish.
 * The grain is an inline SVG fractal-noise (no asset files); reseeding it a
 * few times per second makes it shimmer like real film instead of a frozen
 * texture. The ambient accent glow now lives in <Backdrop>.
 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const frame = useCurrentFrame();
  // Step the seed ~6×/s — enough to live, cheap enough to render.
  const seed = Math.floor(frame / 5) % 12;
  const noise =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
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
    </>
  );
};
