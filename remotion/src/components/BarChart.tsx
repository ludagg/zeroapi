import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../theme";

/**
 * Horizontal bars that grow in with a per-row stagger. Labels sit left, the
 * value rides the end of each bar. Used for "endpoints par modèle".
 */
export const BarChart: React.FC<{
  items: readonly { label: string; value: number }[];
  /** Sequence-relative frame at which the first bar starts. */
  startFrame: number;
  stagger?: number;
  /** Width reserved for the labels column, in px. */
  labelWidth?: number;
}> = ({ items, startFrame, stagger = 7, labelWidth = 150 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...items.map((d) => d.value));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {items.map((d, i) => {
        const start = startFrame + i * stagger;
        const grow = spring({ frame: frame - start, fps, config: { damping: 18, mass: 0.8, stiffness: 130 } });
        const o = interpolate(frame - start, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pct = (d.value / max) * grow;
        return (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 16, opacity: o }}>
            <span
              style={{
                flex: `0 0 ${labelWidth}px`,
                textAlign: "right",
                fontFamily: FONTS.mono,
                fontSize: 22,
                color: COLORS.ink,
              }}
            >
              {d.label}
            </span>
            <div style={{ flex: 1, height: 28, background: COLORS.line, borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct * 100}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${COLORS.accent}, #0BD974)`,
                }}
              />
            </div>
            <span
              style={{
                flex: "0 0 auto",
                width: 34,
                fontFamily: FONTS.mono,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.accentInk,
              }}
            >
              {Math.round(d.value * grow)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
