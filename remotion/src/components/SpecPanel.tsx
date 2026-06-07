import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, SHADOW_MD } from "../theme";
import { ENDPOINTS_TOTAL, RESOURCES } from "../data/script";

/**
 * The "Spec en direct" panel. Resources reveal in a stagger, the endpoint
 * counter ticks toward 24, and the JWT/RBAC badges fade in near the end.
 *
 * Timings below are sequence-relative (the conversation scene starts at 0).
 */
const RESOURCE_START = 60; // first resource appears as Kia names them
const RESOURCE_STAGGER = 16;
const COUNTER_START = 70;
const COUNTER_DUR = 130;
const BADGES_START = 250;

export const SpecPanel: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const revealedCount = RESOURCES.filter(
    (_, i) => frame >= RESOURCE_START + i * RESOURCE_STAGGER,
  ).length;

  const endpoints = Math.round(
    interpolate(frame, [COUNTER_START, COUNTER_START + COUNTER_DUR], [0, ENDPOINTS_TOTAL], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const ready = endpoints >= ENDPOINTS_TOTAL;

  const badgesIn = interpolate(frame, [BADGES_START, BADGES_START + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 20,
        boxShadow: SHADOW_MD,
        padding: compact ? "26px 28px" : "34px 36px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: FONTS.sans, fontWeight: 600, fontSize: 26, color: COLORS.ink }}>
          Spec en direct
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: FONTS.mono,
            fontSize: 18,
            color: ready ? COLORS.accentInk : COLORS.muted,
            background: ready ? COLORS.accentSoft : "transparent",
            padding: "5px 12px",
            borderRadius: 999,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: COLORS.accent,
              opacity: 0.5 + 0.5 * Math.abs(Math.sin(frame / 10)),
            }}
          />
          {ready ? "PRÊTE" : "en cours"}
        </span>
      </div>

      {/* Resource list */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {RESOURCES.map((r, i) => {
          const start = RESOURCE_START + i * RESOURCE_STAGGER;
          const enter = spring({ frame: frame - start, fps, config: { damping: 16, mass: 0.8, stiffness: 150 } });
          const shown = i < revealedCount;
          return (
            <li
              key={r}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: FONTS.mono,
                fontSize: 22,
                color: COLORS.ink,
                opacity: shown ? interpolate(enter, [0, 1], [0, 1]) : 0,
                transform: `translateX(${shown ? interpolate(enter, [0, 1], [-14, 0]) : -14}px)`,
              }}
            >
              <span style={{ color: COLORS.accent, fontWeight: 600 }}>+</span>
              {r}
            </li>
          );
        })}
      </ul>

      {/* Footer stats */}
      <div style={{ display: "flex", gap: 28, borderTop: `1px solid ${COLORS.line}`, paddingTop: 22 }}>
        <Stat value={String(endpoints)} label="endpoints" highlight />
        <Stat value={String(revealedCount)} label="modèles" />
        <Stat value={ready ? "JWT" : "—"} label="auth" />
      </div>

      {/* RBAC badge */}
      <div style={{ opacity: badgesIn, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["client", "guichet", "admin"].map((role) => (
          <span
            key={role}
            style={{
              fontFamily: FONTS.mono,
              fontSize: 16,
              color: COLORS.muted,
              border: `1px solid ${COLORS.line}`,
              borderRadius: 999,
              padding: "5px 12px",
            }}
          >
            {role}
          </span>
        ))}
      </div>
    </div>
  );
};

const Stat: React.FC<{ value: string; label: string; highlight?: boolean }> = ({
  value,
  label,
  highlight,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <span
      style={{
        fontFamily: FONTS.mono,
        fontSize: 40,
        fontWeight: 600,
        color: highlight ? COLORS.accentInk : COLORS.ink,
      }}
    >
      {value}
    </span>
    <span style={{ fontFamily: FONTS.sans, fontSize: 17, color: COLORS.muted }}>{label}</span>
  </div>
);
