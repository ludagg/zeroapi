import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Logo } from "../components/Logo";
import { CTAButton } from "../components/CTAButton";
import { useOrientation } from "../layout";

const REASSURANCE = [
  "Pas de carte requise",
  "Code 100 % exportable",
  "Hébergé en Afrique de l’Ouest",
];

/** Outro: logo re-forms (bookend), CTA, URL, reassurance line. */
export const Scene5Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const orientation = useOrientation();
  const stacked = orientation !== "landscape";

  const headIn = interpolate(frame, [26, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 40,
        padding: "0 56px",
      }}
    >
      <Logo size={stacked ? 150 : 130} startFrame={0} />

      <h2
        style={{
          margin: 0,
          textAlign: "center",
          fontFamily: FONTS.sans,
          fontWeight: 600,
          fontSize: stacked ? 64 : 76,
          lineHeight: 1.1,
          color: COLORS.ink,
          opacity: headIn,
          transform: `translateY(${interpolate(headIn, [0, 1], [14, 0])}px)`,
          maxWidth: 1000,
        }}
      >
        Ton backend, prêt en{" "}
        <span style={{ fontFamily: FONTS.serif, fontStyle: "italic", color: COLORS.accentInk, whiteSpace: "nowrap" }}>
          ~2&nbsp;min
        </span>
        .
      </h2>

      <Sequence from={50} layout="none">
        <CTAButton label="Démarrer gratuitement" pressFrame={60} />
      </Sequence>

      <Sequence from={70} layout="none">
        <Url />
      </Sequence>

      <Sequence from={70} layout="none">
        <Reassurance stacked={stacked} />
      </Sequence>
    </AbsoluteFill>
  );
};

const Url: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity: o, fontFamily: FONTS.mono, fontSize: 30, color: COLORS.ink, letterSpacing: 0.5 }}>
      app.<span style={{ color: COLORS.accentInk }}>zeroapi</span>.app
    </div>
  );
};

const Reassurance: React.FC<{ stacked: boolean }> = ({ stacked }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        opacity: o,
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        gap: stacked ? 10 : 26,
        alignItems: "center",
        fontFamily: FONTS.sans,
        fontSize: 24,
        color: COLORS.muted,
      }}
    >
      {REASSURANCE.map((r, i) => (
        <span key={r} style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {r}
          </span>
          {!stacked && i < REASSURANCE.length - 1 && (
            <span style={{ width: 5, height: 5, borderRadius: 999, background: COLORS.line }} />
          )}
        </span>
      ))}
    </div>
  );
};
