import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, SHADOW_MD } from "../theme";
import { USE_CASES } from "../data/usecases";
import { UseCaseIcon } from "../components/UseCaseIcon";
import { useOrientation } from "../layout";

/**
 * "Pour n'importe quel backend" — the demo built a bus-booking API, this scene
 * shows the same conversation scaffolds e-commerce, fintech, logistics, etc.,
 * each with the concrete models Kia would generate.
 */
export const Scene6UseCases: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const orientation = useOrientation();
  const stacked = orientation !== "landscape";

  const titleIn = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [195, 210], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        padding: stacked ? "60px 50px" : "70px 110px",
        alignItems: "center",
        justifyContent: "center",
        gap: stacked ? 30 : 40,
        opacity: 1 - exit,
        transform: `translateY(${-14 * exit}px)`,
      }}
    >
      <h2
        style={{
          margin: 0,
          textAlign: "center",
          fontFamily: FONTS.sans,
          fontWeight: 600,
          fontSize: stacked ? 54 : 64,
          color: COLORS.ink,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [16, 0])}px)`,
        }}
      >
        Pour{" "}
        <span style={{ fontFamily: FONTS.serif, fontStyle: "italic", color: COLORS.accentInk }}>n’importe quel</span>{" "}
        backend.
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: stacked ? "1fr 1fr" : "1fr 1fr 1fr",
          gap: stacked ? 18 : 24,
          width: "100%",
          maxWidth: 1500,
        }}
      >
        {USE_CASES.map((uc, i) => {
          const start = 16 + i * 11;
          const enter = spring({ frame: frame - start, fps, config: { damping: 18, mass: 0.8, stiffness: 140 } });
          const o = interpolate(frame - start, [0, 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(enter, [0, 1], [26, 0]);
          return (
            <div
              key={uc.title}
              style={{
                opacity: o,
                transform: `translateY(${y}px) scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
                background: COLORS.surface,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 18,
                boxShadow: SHADOW_MD,
                padding: stacked ? "22px 24px" : "26px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: COLORS.accentSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UseCaseIcon icon={uc.icon} size={26} />
                </span>
                <span style={{ fontFamily: FONTS.sans, fontWeight: 600, fontSize: 30, color: COLORS.ink }}>
                  {uc.title}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {uc.models.map((m, mi) => {
                  const ms = start + 8 + mi * 3;
                  const mo = interpolate(frame - ms, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  return (
                    <span
                      key={m}
                      style={{
                        opacity: mo,
                        fontFamily: FONTS.mono,
                        fontSize: 19,
                        color: COLORS.ink,
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 999,
                        padding: "6px 14px",
                      }}
                    >
                      <span style={{ color: COLORS.accent, marginRight: 6, fontWeight: 600 }}>+</span>
                      {m}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Footnote />
    </AbsoluteFill>
  );
};

const Footnote: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [110, 128], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <span style={{ opacity: o, fontFamily: FONTS.sans, fontSize: 26, color: COLORS.muted, textAlign: "center" }}>
      Même conversation. Décris ton idée — Kia génère le backend.
    </span>
  );
};
