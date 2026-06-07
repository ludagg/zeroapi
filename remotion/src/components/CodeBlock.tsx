import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../theme";
import { typewriter } from "../utils";

/**
 * Dark code panel that types out a Hono route with light faux-syntax
 * highlighting (keywords, strings, the route literal in accent green).
 */
const KEYWORDS = ["app", "async", "await", "const", "return"];

function colorFor(token: string): string {
  if (token.includes('"/reservations"')) return COLORS.accent;
  if (token.startsWith('"') || token.startsWith("'")) return "#9DE6C0";
  if (KEYWORDS.some((k) => token === k || token === k + "(")) return "#8FB8FF";
  return COLORS.darkInk;
}

export const CodeBlock: React.FC<{ code: string; startFrame: number }> = ({
  code,
  startFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = typewriter(code, frame, startFrame, fps, 38);
  const cursorOn = Math.floor(frame / 14) % 2 === 0;
  const lines = shown.split("\n");

  return (
    <div
      style={{
        background: COLORS.darkSurface,
        borderRadius: 16,
        border: `1px solid rgba(255,255,255,0.06)`,
        padding: "26px 30px",
        boxShadow: "0 20px 50px rgba(10,10,10,0.18)",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* window dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[COLORS.accent, COLORS.line, COLORS.line].map((c, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: 999, background: c, opacity: 0.7 }} />
        ))}
      </div>
      <pre
        style={{
          margin: 0,
          fontFamily: FONTS.mono,
          fontSize: 23,
          lineHeight: 1.55,
          color: COLORS.darkInk,
          whiteSpace: "pre-wrap",
        }}
      >
        {lines.map((line, li) => (
          <div key={li}>
            {line.split(/(\s+)/).map((tok, ti) => (
              <span key={ti} style={{ color: colorFor(tok.trim()) }}>
                {tok}
              </span>
            ))}
            {li === lines.length - 1 && (
              <span style={{ opacity: cursorOn ? 1 : 0, color: COLORS.accent }}>▋</span>
            )}
          </div>
        ))}
      </pre>
    </div>
  );
};
