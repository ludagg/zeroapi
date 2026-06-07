import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, SHADOW_LG } from "../theme";
import { ChatBubble, TypingDots } from "../components/ChatBubble";
import { SpecPanel } from "../components/SpecPanel";
import { CHAT } from "../data/script";
import { typewriter, typedDone } from "../utils";
import { useOrientation } from "../layout";

/**
 * Each chat step's schedule (sequence-relative frames). Kia bubbles show a
 * typing indicator first, then type their text in.
 */
const SCHEDULE = [
  { dots: null, enter: 6 }, // user 1
  { dots: 44, enter: 60 }, // kia 1
  { dots: null, enter: 150 }, // user 2
  { dots: 195, enter: 210 }, // kia 2
];

export const Scene2Conversation: React.FC = () => {
  const frame = useCurrentFrame();
  const orientation = useOrientation();
  const stacked = orientation !== "landscape";

  const intro = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [285, 300], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        padding: stacked ? "70px 56px" : "84px 96px",
        opacity: 1 - exit,
        transform: `scale(${interpolate(intro, [0, 1], [0.98, 1]) * interpolate(exit, [0, 1], [1, 0.98])})`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: stacked ? "column" : "row",
          gap: stacked ? 36 : 56,
          width: "100%",
          height: "100%",
          alignItems: "stretch",
        }}
      >
        {/* Chat panel */}
        <div
          style={{
            flex: stacked ? "1 1 auto" : "0 0 58%",
            background: COLORS.surface,
            border: `1px solid ${COLORS.line}`,
            borderRadius: 24,
            boxShadow: SHADOW_LG,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Header />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: 22,
              padding: "32px 34px",
            }}
          >
            {CHAT.map((step, i) => {
              const sched = SCHEDULE[i];
              if (frame < (sched.dots ?? sched.enter)) return null;

              // Kia: show dots before the bubble enters.
              if (step.kind === "kia" && sched.dots != null && frame < sched.enter) {
                return <TypingDots key={i} />;
              }

              const isKia = step.kind === "kia";
              const text = isKia
                ? typewriter(step.text, frame, sched.enter, 30, 34)
                : step.text;
              const stillTyping = isKia && !typedDone(step.text, frame, sched.enter, 30, 34);

              return (
                <ChatBubble
                  key={i}
                  kind={step.kind}
                  text={text}
                  enterFrame={sched.enter}
                  showCursor={stillTyping}
                />
              );
            })}
          </div>
          <Composer />
        </div>

        {/* Spec panel */}
        <div style={{ flex: stacked ? "0 0 auto" : "1 1 42%", display: "flex" }}>
          <div style={{ width: "100%", alignSelf: "center" }}>
            <SpecPanel compact={stacked} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Header: React.FC = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "20px 28px",
      borderBottom: `1px solid ${COLORS.line}`,
      fontFamily: FONTS.mono,
      fontSize: 19,
      color: COLORS.muted,
    }}
  >
    <div style={{ display: "flex", gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 12, height: 12, borderRadius: 999, background: COLORS.line }} />
      ))}
    </div>
    generate · conversation avec Kia
  </div>
);

const Composer: React.FC = () => {
  const frame = useCurrentFrame();
  const ready = frame > 270;
  const cursorOn = Math.floor(frame / 15) % 2 === 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "20px 28px",
        borderTop: `1px solid ${COLORS.line}`,
      }}
    >
      <span style={{ fontFamily: FONTS.sans, fontSize: 22, color: COLORS.muted }}>
        {ready ? "Décris la suite, ou ajuste la spec…" : ""}
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: 22,
            marginLeft: 2,
            verticalAlign: "middle",
            background: COLORS.ink,
            opacity: cursorOn ? 0.7 : 0,
          }}
        />
      </span>
      <Sequence from={266} layout="none">
        <SubmitButton ready={ready} />
      </Sequence>
    </div>
  );
};

const SubmitButton: React.FC<{ ready: boolean }> = ({ ready }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "12px 22px",
      borderRadius: 999,
      background: ready ? COLORS.accent : COLORS.line,
      color: ready ? COLORS.accentInk : COLORS.muted,
      fontFamily: FONTS.sans,
      fontWeight: 600,
      fontSize: 22,
      transition: "none",
    }}
  >
    {ready ? "Lancer" : "Kia réfléchit…"}
    {ready && (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    )}
  </div>
);
