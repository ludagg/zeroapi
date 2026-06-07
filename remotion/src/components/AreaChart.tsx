import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../theme";

/**
 * An area/line chart that draws left→right as `progress` (0→1) advances, with
 * an accent gradient fill, faint gridlines, and a pulsing head dot. Drawn in
 * real pixel space (no non-uniform SVG scaling) so strokes stay crisp.
 */
export const AreaChart: React.FC<{
  data: readonly number[];
  w: number;
  h: number;
  /** 0→1 reveal of the series. */
  progress: number;
}> = ({ data, w, h, progress }) => {
  const frame = useCurrentFrame();
  const padX = 10;
  const padTop = 14;
  const padBot = 10;
  const n = data.length;
  const max = Math.max(...data);
  const min = Math.min(...data);

  const xAt = (i: number) => padX + (i / (n - 1)) * (w - 2 * padX);
  const yAt = (v: number) => {
    const t = (v - min) / (max - min || 1);
    return h - padBot - t * (h - padTop - padBot);
  };

  const reveal = Math.max(0, progress) * (n - 1);
  const last = Math.floor(reveal);
  const frac = reveal - last;

  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= last && i < n; i++) pts.push([xAt(i), yAt(data[i])]);
  if (last < n - 1) {
    const vx = xAt(last) + (xAt(last + 1) - xAt(last)) * frac;
    const vy = yAt(data[last]) + (yAt(data[last + 1]) - yAt(data[last])) * frac;
    pts.push([vx, vy]);
  }
  if (pts.length === 0) pts.push([xAt(0), yAt(data[0])]);

  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const head = pts[pts.length - 1];
  const area = `${line} L${head[0].toFixed(1)} ${h - padBot} L${pts[0][0].toFixed(1)} ${h - padBot} Z`;

  // Gentle pulse on the leading dot.
  const pulse = 0.5 + 0.5 * Math.sin(frame / 5);

  const gid = "areaGrad";
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.accent} stopOpacity="0.34" />
          <stop offset="100%" stopColor={COLORS.accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* gridlines + y labels */}
      {[0, 0.5, 1].map((g) => {
        const y = padTop + g * (h - padTop - padBot);
        const val = Math.round((max - g * (max - min)) / 100) / 10; // in k
        return (
          <g key={g}>
            <line x1={padX} y1={y} x2={w - padX} y2={y} stroke={COLORS.line} strokeWidth="1" />
            <text x={w - padX} y={y - 5} textAnchor="end" fontFamily={FONTS.mono} fontSize="13" fill={COLORS.muted}>
              {val}k
            </text>
          </g>
        );
      })}

      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={COLORS.accent} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

      {/* leading head dot */}
      <circle cx={head[0]} cy={head[1]} r={7 + pulse * 4} fill={COLORS.accentGlow} />
      <circle cx={head[0]} cy={head[1]} r="5" fill={COLORS.accent} stroke={COLORS.bg} strokeWidth="2" />
    </svg>
  );
};

/** Smooth 0→1 used to drive an AreaChart reveal over a frame window. */
export const revealProgress = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
