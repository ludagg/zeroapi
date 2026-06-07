import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../theme";

/** Accent pill CTA with a continuous glow pulse. */
export const CTAButton: React.FC<{ label: string; pressFrame?: number }> = ({
  label,
  pressFrame,
}) => {
  const frame = useCurrentFrame();

  // Slow glow pulse (~1.2s loop).
  const pulse = 0.5 + 0.5 * Math.sin(frame / 6);
  const glow = interpolate(pulse, [0, 1], [0.25, 0.55]);

  // Optional one-shot press to imply clickability.
  let press = 1;
  if (pressFrame != null) {
    press = interpolate(
      frame,
      [pressFrame, pressFrame + 4, pressFrame + 9],
      [1, 0.97, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "20px 34px",
        borderRadius: 999,
        background: COLORS.accent,
        color: COLORS.accentInk,
        fontFamily: FONTS.sans,
        fontWeight: 600,
        fontSize: 30,
        transform: `scale(${press})`,
        boxShadow: `0 0 0 1px rgba(0,41,20,0.06), 0 16px 40px rgba(16,240,131,${glow})`,
      }}
    >
      {label}
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </div>
  );
};
