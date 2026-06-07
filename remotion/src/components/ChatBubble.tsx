import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "../theme";

/** A single chat bubble (user right / Kia left) with spring entrance. */
export const ChatBubble: React.FC<{
  kind: "user" | "kia";
  text: string;
  /** Sequence-relative frame at which the bubble enters. */
  enterFrame: number;
  /** Optional blinking cursor while still typing. */
  showCursor?: boolean;
}> = ({ kind, text, enterFrame, showCursor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - enterFrame;

  const enter = spring({
    frame: f,
    fps,
    config: { damping: 18, mass: 0.9, stiffness: 130 },
  });
  const opacity = interpolate(f, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(enter, [0, 1], [12, 0]);
  const scale = interpolate(enter, [0, 1], [0.95, 1]);

  const isUser = kind === "user";
  const cursorOn = Math.floor(frame / 15) % 2 === 0;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        gap: 14,
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
      }}
    >
      {!isUser && (
        <div
          style={{
            flex: "0 0 auto",
            width: 44,
            height: 44,
            borderRadius: 12,
            background: COLORS.ink,
            color: COLORS.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONTS.serif,
            fontStyle: "italic",
            fontSize: 26,
          }}
        >
          K
        </div>
      )}
      <div
        style={{
          maxWidth: "76%",
          padding: "18px 22px",
          borderRadius: 18,
          borderTopRightRadius: isUser ? 6 : 18,
          borderTopLeftRadius: isUser ? 18 : 6,
          background: isUser ? COLORS.accentSoft : COLORS.surface,
          color: isUser ? COLORS.accentInk : COLORS.ink,
          border: `1px solid ${isUser ? "transparent" : COLORS.line}`,
          fontFamily: FONTS.sans,
          fontSize: 28,
          lineHeight: 1.45,
          boxShadow: isUser ? "none" : "0 6px 18px rgba(10,10,10,0.05)",
        }}
      >
        {text}
        {showCursor && (
          <span
            style={{
              display: "inline-block",
              width: 3,
              height: 26,
              marginLeft: 3,
              verticalAlign: "text-bottom",
              background: COLORS.accent,
              opacity: cursorOn ? 1 : 0,
            }}
          />
        )}
      </div>
    </div>
  );
};

/** Three-dot "Kia is typing" indicator. */
export const TypingDots: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: COLORS.ink,
          color: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONTS.serif,
          fontStyle: "italic",
          fontSize: 26,
        }}
      >
        K
      </div>
      <div
        style={{
          display: "flex",
          gap: 7,
          padding: "20px 22px",
          borderRadius: 18,
          borderTopLeftRadius: 6,
          background: COLORS.surface,
          border: `1px solid ${COLORS.line}`,
        }}
      >
        {[0, 1, 2].map((i) => {
          const t = (frame + i * 6) % 36;
          const o = t < 18 ? 0.3 + (t / 18) * 0.7 : 1 - ((t - 18) / 18) * 0.7;
          return (
            <span
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: COLORS.accent,
                opacity: o,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
