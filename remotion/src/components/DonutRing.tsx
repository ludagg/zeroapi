import { useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../theme";
import { revealProgress } from "./AreaChart";

/**
 * A ring that sweeps to `value`% as it reveals, with the number counting up
 * in the centre. Used for the "disponibilité" gauge.
 */
export const DonutRing: React.FC<{
  value: number;
  size: number;
  label: string;
  startFrame: number;
  decimals?: number;
  suffix?: string;
}> = ({ value, size, label, startFrame, decimals = 0, suffix = " %" }) => {
  const frame = useCurrentFrame();
  const p = revealProgress(frame, startFrame, 44);
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const shown = value * p;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.line} strokeWidth="12" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={COLORS.accent}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - (shown / 100))}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONTS.mono,
            fontWeight: 600,
            fontSize: size * 0.22,
            color: COLORS.accentInk,
          }}
        >
          {shown.toFixed(decimals)}
          <span style={{ fontSize: size * 0.12 }}>{suffix}</span>
        </div>
      </div>
      <span style={{ fontFamily: FONTS.sans, fontSize: 22, color: COLORS.muted }}>{label}</span>
    </div>
  );
};
