import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

/**
 * A living, continuous backdrop rendered once behind every scene. Two soft
 * accent "auroras" drift slowly and a faint dot-grid parallaxes, giving the
 * piece depth instead of flat white — and, because it never unmounts, the
 * per-scene opacity fades read as clean dissolves through a shared ground.
 */
export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30; // seconds

  // Slow, irrational-ish drift so the two blobs never visibly loop together.
  const ax = 28 + 9 * Math.sin(t * 0.31);
  const ay = 24 + 7 * Math.cos(t * 0.24);
  const bx = 76 + 8 * Math.cos(t * 0.27);
  const by = 34 + 7 * Math.sin(t * 0.19);

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* drifting accent auroras */}
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(42% 42% at ${ax}% ${ay}%, rgba(16,240,131,0.16), transparent 70%)`,
            `radial-gradient(46% 46% at ${bx}% ${by}%, rgba(16,240,131,0.10), transparent 72%)`,
            `radial-gradient(60% 40% at 50% 118%, ${COLORS.accentGlow}, transparent 62%)`,
          ].join(","),
        }}
      />
      {/* faint cool counter-tint for balance */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(50% 50% at 12% 8%, rgba(10,10,10,0.035), transparent 60%)`,
        }}
      />
      {/* parallaxing dot grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${COLORS.line} 1.4px, transparent 1.4px)`,
          backgroundSize: "46px 46px",
          backgroundPosition: `${frame * 0.18}px ${frame * 0.09}px`,
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};
