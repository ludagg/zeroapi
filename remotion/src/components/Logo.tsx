import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

/**
 * The ZeroAPI mark (app/icon.svg) recreated and animated: the ring draws in
 * via strokeDashoffset, then the accent node pops with a glow bloom.
 */
export const Logo: React.FC<{
  size?: number;
  /** Frame (relative to the sequence) at which the draw-in begins. */
  startFrame?: number;
  /** When true, renders fully formed (no draw-in) — for the outro hold. */
  instant?: boolean;
}> = ({ size = 200, startFrame = 0, instant = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - startFrame;

  // viewBox is 32 units; ring radius 9.2 → circumference.
  const circ = 2 * Math.PI * 9.2;
  const drawn = instant
    ? 1
    : interpolate(f, [0, 30], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  const tileScale = instant
    ? 1
    : spring({ frame: f, fps, config: { damping: 18, mass: 0.9, stiffness: 120 }, durationInFrames: 40 }) *
        0.04 +
      0.96;

  const nodePop = instant
    ? 1
    : spring({
        frame: f - 26,
        fps,
        config: { damping: 14, mass: 0.7, stiffness: 160 },
      });

  const glow = instant
    ? 0
    : interpolate(f, [26, 40, 60], [0, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      style={{ transform: `scale(${tileScale})`, overflow: "visible" }}
    >
      <rect width="32" height="32" rx="8" fill={COLORS.ink} />
      <circle
        cx="16"
        cy="16"
        r="9.2"
        fill="none"
        stroke={COLORS.bg}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - drawn)}
        transform="rotate(-90 16 16)"
      />
      {/* glow bloom behind the node */}
      <circle
        cx="22.5"
        cy="9.5"
        r={3.6 + glow * 5}
        fill={COLORS.accent}
        opacity={glow * 0.5}
        style={{ filter: "blur(3px)" }}
      />
      <circle
        cx="22.5"
        cy="9.5"
        r={3.6 * nodePop}
        fill={COLORS.accent}
        stroke={COLORS.ink}
        strokeWidth="1.4"
      />
    </svg>
  );
};
