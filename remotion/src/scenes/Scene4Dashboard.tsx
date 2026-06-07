import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONTS, SHADOW_MD } from "../theme";
import { AreaChart, revealProgress } from "../components/AreaChart";
import { BarChart } from "../components/BarChart";
import { DonutRing } from "../components/DonutRing";
import { Counter } from "../components/Counter";
import { ENDPOINTS_BY_MODEL, PROD_KPIS, REQ_PEAK, REQ_SERIES } from "../data/script";
import { useOrientation } from "../layout";

/**
 * "En production" — the generated backend running live. Animated data graphs
 * (requests/min area chart, availability donut, endpoints-per-model bars,
 * latency/tests counters) so the promo shows real, working observability.
 */
export const Scene4Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const orientation = useOrientation();
  const stacked = orientation !== "landscape";

  const titleIn = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = interpolate(frame, [165, 180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const areaW = stacked ? (orientation === "vertical" ? 900 : 880) : 800;
  const areaH = stacked ? 240 : 290;
  const donutSize = stacked ? 168 : 190;

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
      {/* Title + live pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [16, 0])}px)`,
        }}
      >
        <h2 style={{ margin: 0, fontFamily: FONTS.sans, fontWeight: 600, fontSize: stacked ? 58 : 66, color: COLORS.ink }}>
          En{" "}
          <span style={{ fontFamily: FONTS.serif, fontStyle: "italic", color: COLORS.accentInk }}>production</span>.
        </h2>
        <LivePill />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: stacked ? "column" : "row",
          gap: stacked ? 22 : 28,
          width: "100%",
          maxWidth: 1640,
          alignItems: "stretch",
          justifyContent: "center",
        }}
      >
        {/* Left: requests area chart */}
        <Card style={{ flex: stacked ? "0 0 auto" : "1.45 1 0", gap: 14 }}>
          <CardHead title="Requêtes / min">
            <Counter value={REQ_PEAK} label="" startFrame={12} dur={96} size={40} />
          </CardHead>
          <AreaChart data={REQ_SERIES} w={areaW} h={areaH} progress={revealProgress(frame, 12, 96)} />
        </Card>

        {/* Right column */}
        <div
          style={{
            flex: stacked ? "0 0 auto" : "1 1 0",
            display: "flex",
            flexDirection: stacked ? "row" : "column",
            gap: stacked ? 22 : 28,
          }}
        >
          <Card style={{ flex: "1 1 0", alignItems: "center", justifyContent: "center" }}>
            <DonutRing
              value={PROD_KPIS[0].value}
              size={donutSize}
              label={PROD_KPIS[0].label}
              startFrame={40}
              decimals={PROD_KPIS[0].decimals}
              suffix={PROD_KPIS[0].suffix}
            />
          </Card>
          <Card style={{ flex: "1 1 0", justifyContent: "center", gap: 22 }}>
            <Counter
              value={PROD_KPIS[1].value}
              label={PROD_KPIS[1].label}
              startFrame={52}
              decimals={PROD_KPIS[1].decimals}
              suffix={PROD_KPIS[1].suffix}
            />
            <Counter
              value={PROD_KPIS[2].value}
              label={PROD_KPIS[2].label}
              startFrame={60}
              decimals={PROD_KPIS[2].decimals}
              suffix={PROD_KPIS[2].suffix}
            />
          </Card>
        </div>
      </div>

      {/* Bottom: endpoints per model */}
      <Card style={{ width: "100%", maxWidth: 1640, gap: 18 }}>
        <CardHead title="Endpoints par modèle" />
        <BarChart items={ENDPOINTS_BY_MODEL} startFrame={30} labelWidth={stacked ? 170 : 200} />
      </Card>
    </AbsoluteFill>
  );
};

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 20,
      boxShadow: SHADOW_MD,
      padding: "26px 30px",
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    {children}
  </div>
);

const CardHead: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
    <span style={{ fontFamily: FONTS.sans, fontWeight: 600, fontSize: 24, color: COLORS.ink }}>{title}</span>
    {children}
  </div>
);

const LivePill: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin(frame / 9));
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        fontFamily: FONTS.mono,
        fontSize: 18,
        color: COLORS.accentInk,
        background: COLORS.accentSoft,
        padding: "7px 15px",
        borderRadius: 999,
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 999, background: COLORS.accent, opacity: pulse }} />
      LIVE
    </span>
  );
};
