import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../theme";
import { VALUE_PROPS } from "../data/script";
import { useOrientation } from "../layout";

/** Staggered value props with an accent underline wipe per item. */
export const Scene4ValueProps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const orientation = useOrientation();
  const stacked = orientation !== "landscape";

  const exit = interpolate(frame, [105, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        padding: stacked ? "0 64px" : "0 140px",
        opacity: 1 - exit,
        transform: `translateY(${-14 * exit}px)`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {VALUE_PROPS.map((vp, i) => {
          const start = 8 + i * 14;
          const enter = spring({ frame: frame - start, fps, config: { damping: 18, mass: 0.8, stiffness: 140 } });
          const o = interpolate(frame - start, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(enter, [0, 1], [18, 0]);
          const underline = interpolate(frame - start, [6, 24], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const subO = interpolate(frame - start, [8, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div
              key={vp.label}
              style={{
                opacity: o,
                transform: `translateY(${y}px)`,
                padding: stacked ? "22px 0" : "26px 0",
                borderBottom: i < VALUE_PROPS.length - 1 ? `1px solid ${COLORS.line}` : "none",
                display: "flex",
                flexDirection: stacked ? "column" : "row",
                alignItems: stacked ? "flex-start" : "baseline",
                gap: stacked ? 6 : 28,
              }}
            >
              <div style={{ position: "relative", flex: "0 0 auto" }}>
                <span
                  style={{
                    fontFamily: FONTS.sans,
                    fontWeight: 600,
                    fontSize: stacked ? 52 : 60,
                    color: COLORS.ink,
                  }}
                >
                  {vp.label}
                </span>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    bottom: -6,
                    height: 4,
                    width: `${underline}%`,
                    background: COLORS.accent,
                    borderRadius: 999,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: stacked ? 28 : 34,
                  color: COLORS.muted,
                  opacity: subO,
                }}
              >
                {vp.sub}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
