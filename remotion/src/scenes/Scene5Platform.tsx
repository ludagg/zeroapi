import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, SHADOW_MD } from "../theme";
import { useOrientation } from "../layout";

/**
 * "Multi-IA · Zéro lock-in" — visualises two value props the typographic
 * scene only states: a live AI router that fails over between providers, and
 * the deploy-anywhere surface. Reinforces "tu possèdes ton backend".
 */
const PROVIDERS = ["Claude", "Mistral", "Gemini"] as const;
const TARGETS = ["Vercel", "Docker", "Railway", "Fly.io", "VPS", "AWS"] as const;

/** Frame (scene-relative) at which the router fails Claude over to Mistral. */
const FAILOVER = 120;

export const Scene5Platform: React.FC = () => {
  const frame = useCurrentFrame();
  const orientation = useOrientation();
  const stacked = orientation !== "landscape";

  const titleIn = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [225, 240], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const activeIndex = frame >= FAILOVER ? 1 : 0;

  return (
    <AbsoluteFill
      style={{
        padding: stacked ? "60px 50px" : "70px 96px",
        alignItems: "center",
        justifyContent: "center",
        gap: stacked ? 26 : 34,
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
          fontSize: stacked ? 56 : 66,
          color: COLORS.ink,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [16, 0])}px)`,
        }}
      >
        Multi-IA.{" "}
        <span style={{ fontFamily: FONTS.serif, fontStyle: "italic", color: COLORS.accentInk }}>Zéro</span> lock-in.
      </h2>

      <div
        style={{
          display: "flex",
          flexDirection: stacked ? "column" : "row",
          gap: stacked ? 22 : 28,
          width: "100%",
          maxWidth: 1500,
          alignItems: "stretch",
        }}
      >
        {/* AI router with failover */}
        <Card flex={1}>
          <CardHead title="Routage IA" badge="failover" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>
            {PROVIDERS.map((p, i) => {
              const start = 26 + i * 12;
              const enter = interpolate(frame - start, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const active = i === activeIndex;
              const failed = i === 0 && frame >= FAILOVER;
              return (
                <ProviderRow key={p} name={p} active={active} failed={failed} opacity={enter} />
              );
            })}
          </div>
          <FailoverNote show={frame >= FAILOVER} />
        </Card>

        {/* Deploy anywhere */}
        <Card flex={1}>
          <CardHead title="Déploie où tu veux" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginTop: 6,
            }}
          >
            {TARGETS.map((t, i) => {
              const start = 34 + i * 9;
              const pop = spring({ frame: frame - start, fps: 30, config: { damping: 16, mass: 0.7, stiffness: 150 } });
              const o = interpolate(frame - start, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div
                  key={t}
                  style={{
                    opacity: o,
                    transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "16px 10px",
                    borderRadius: 12,
                    border: `1px solid ${COLORS.line}`,
                    background: COLORS.bg,
                    fontFamily: FONTS.mono,
                    fontSize: 22,
                    color: COLORS.ink,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: COLORS.accent }} />
                  {t}
                </div>
              );
            })}
          </div>
          <Caption>ton code, ton infra — 0 vendor lock-in</Caption>
        </Card>
      </div>
    </AbsoluteFill>
  );
};

const Card: React.FC<{ children: React.ReactNode; flex: number }> = ({ children, flex }) => (
  <div
    style={{
      flex: `${flex} 1 0`,
      background: COLORS.surface,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 20,
      boxShadow: SHADOW_MD,
      padding: "26px 30px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}
  >
    {children}
  </div>
);

const CardHead: React.FC<{ title: string; badge?: string }> = ({ title, badge }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
    <span style={{ fontFamily: FONTS.sans, fontWeight: 600, fontSize: 24, color: COLORS.ink }}>{title}</span>
    {badge && (
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: 16,
          color: COLORS.muted,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 999,
          padding: "4px 12px",
        }}
      >
        {badge}
      </span>
    )}
  </div>
);

const ProviderRow: React.FC<{ name: string; active: boolean; failed: boolean; opacity: number }> = ({
  name,
  active,
  failed,
  opacity,
}) => {
  const frame = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.sin(frame / 6);
  const dot = failed ? "#E5533C" : active ? COLORS.accent : COLORS.line;
  return (
    <div
      style={{
        opacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderRadius: 14,
        border: `1.5px solid ${active ? COLORS.accent : COLORS.line}`,
        background: active ? COLORS.accentSoft : COLORS.surface,
      }}
    >
      <span style={{ fontFamily: FONTS.mono, fontSize: 24, color: COLORS.ink }}>{name}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: FONTS.mono, fontSize: 17, color: COLORS.muted }}>
        {failed ? "indispo" : active ? "actif" : "prêt"}
        <span
          style={{
            width: 11,
            height: 11,
            borderRadius: 999,
            background: dot,
            opacity: active && !failed ? 0.5 + 0.5 * pulse : 1,
          }}
        />
      </span>
    </div>
  );
};

const FailoverNote: React.FC<{ show: boolean }> = ({ show }) => {
  const frame = useCurrentFrame();
  const o = show ? interpolate(frame, [FAILOVER, FAILOVER + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <div style={{ opacity: o, marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accentInk} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v6h6M20 20v-6h-6" />
        <path d="M20 10a8 8 0 0 0-14.3-3.7L4 8M4 14a8 8 0 0 0 14.3 3.7L20 16" />
      </svg>
      <span style={{ fontFamily: FONTS.sans, fontSize: 21, color: COLORS.muted }}>bascule automatique, sans coupure</span>
    </div>
  );
};

const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [90, 106], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <span style={{ opacity: o, marginTop: "auto", paddingTop: 12, fontFamily: FONTS.sans, fontSize: 21, color: COLORS.muted }}>
      {children}
    </span>
  );
};
