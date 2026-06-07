import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, SHADOW_MD } from "../theme";

/** A deliverable chip that flies in and pops an accent check on settle. */
export const DeliverableCard: React.FC<{
  label: string;
  sub: string;
  enterFrame: number;
}> = ({ label, sub, enterFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - enterFrame;

  const enter = spring({
    frame: f,
    fps,
    config: { damping: 17, mass: 0.9, stiffness: 140 },
  });
  const opacity = interpolate(f, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(enter, [0, 1], [24, 0]);
  const scale = interpolate(enter, [0, 1], [0.9, 1]);

  // Check pops slightly after the card settles.
  const check = spring({
    frame: f - 14,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 180 },
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "22px 26px",
        background: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 16,
        boxShadow: SHADOW_MD,
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          width: 44,
          height: 44,
          borderRadius: 999,
          background: COLORS.accentSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${check})`,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.accentInk} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: 24, fontWeight: 600, color: COLORS.ink }}>
          {label}
        </span>
        <span style={{ fontFamily: FONTS.sans, fontSize: 18, color: COLORS.muted }}>{sub}</span>
      </div>
    </div>
  );
};
