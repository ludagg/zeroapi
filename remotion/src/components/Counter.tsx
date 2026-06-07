import { useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../theme";
import { revealProgress } from "./AreaChart";

/** A KPI that counts up to `value` over a frame window, with a unit + caption. */
export const Counter: React.FC<{
  value: number;
  label: string;
  startFrame: number;
  dur?: number;
  decimals?: number;
  suffix?: string;
  size?: number;
}> = ({ value, label, startFrame, dur = 40, decimals = 0, suffix = "", size = 52 }) => {
  const frame = useCurrentFrame();
  const shown = value * revealProgress(frame, startFrame, dur);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: FONTS.mono, fontWeight: 600, fontSize: size, color: COLORS.ink, lineHeight: 1 }}>
        {shown.toFixed(decimals)}
        <span style={{ color: COLORS.accentInk }}>{suffix}</span>
      </span>
      <span style={{ fontFamily: FONTS.sans, fontSize: 20, color: COLORS.muted }}>{label}</span>
    </div>
  );
};
