import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, EASE, FONTS } from "../theme";
import { Logo } from "../components/Logo";
import { useOrientation } from "../layout";

/** Tagline split into animated words; "Kia" gets serif-italic accent. */
const WORDS = [
  { t: "Parle", kia: false },
  { t: "à", kia: false },
  { t: "Kia.", kia: true },
  { t: "Ton", kia: false, br: true },
  { t: "backend", kia: false },
  { t: "s’écrit.", kia: false },
];

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const orientation = useOrientation();
  const logoSize = orientation === "landscape" ? 190 : 220;

  // whole group eases out at the end for the dissolve
  const exit = interpolate(frame, [105, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 56,
        transform: `translateY(${-16 * exit}px)`,
        opacity: 1 - exit,
      }}
    >
      <Logo size={logoSize} />

      <h1
        style={{
          margin: 0,
          textAlign: "center",
          fontFamily: FONTS.sans,
          fontWeight: 600,
          fontSize: orientation === "vertical" ? 72 : 84,
          lineHeight: 1.1,
          color: COLORS.ink,
          maxWidth: orientation === "vertical" ? 820 : 1100,
        }}
      >
        {WORDS.map((w, i) => {
          const start = 40 + i * 5;
          const enter = spring({ frame: frame - start, fps, config: { damping: 18, mass: 0.8, stiffness: 130 } });
          const y = interpolate(enter, [0, 1], [14, 0]);
          const o = interpolate(frame - start, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE,
          });
          return (
            <span key={i}>
              {w.br && <br />}
              <span
                style={{
                  display: "inline-block",
                  transform: `translateY(${y}px)`,
                  opacity: o,
                  marginRight: 16,
                  fontFamily: w.kia ? FONTS.serif : FONTS.sans,
                  fontStyle: w.kia ? "italic" : "normal",
                  color: w.kia ? COLORS.accentInk : COLORS.ink,
                  fontSize: w.kia ? "1.08em" : undefined,
                  textShadow: w.kia ? "0 0 34px rgba(16,240,131,0.45)" : undefined,
                }}
              >
                {w.t}
              </span>
            </span>
          );
        })}
      </h1>

      {/* kicker */}
      <Sequence from={70} layout="none">
        <Kicker />
      </Sequence>
    </AbsoluteFill>
  );
};

const Kicker: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        opacity: o,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: FONTS.mono,
        fontSize: 22,
        color: COLORS.muted,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 999,
        padding: "10px 20px",
        background: COLORS.surface,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 999, background: COLORS.accent }} />
      Génération conversationnelle · multi-IA
    </div>
  );
};
