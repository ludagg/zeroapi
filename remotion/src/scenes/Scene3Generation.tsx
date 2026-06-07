import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../theme";
import { DeliverableCard } from "../components/DeliverableCard";
import { CodeBlock } from "../components/CodeBlock";
import { CODE_SNIPPET, DELIVERABLES } from "../data/script";
import { useOrientation } from "../layout";

/** Generation scene: title + progress shimmer, cascade of deliverables, code typing. */
export const Scene3Generation: React.FC = () => {
  const frame = useCurrentFrame();
  const orientation = useOrientation();
  const stacked = orientation !== "landscape";

  const titleIn = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(titleIn, [0, 1], [16, 0]);
  const exit = interpolate(frame, [195, 210], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const CARD_START = 26;
  const CARD_STAGGER = 13;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        padding: stacked ? "70px 56px" : "80px 96px",
        alignItems: "center",
        gap: stacked ? 34 : 44,
        opacity: 1 - exit,
        transform: `translateY(${-14 * exit}px)`,
      }}
    >
      {/* Title + shimmer */}
      <div style={{ opacity: titleIn, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
        <h2 style={{ margin: 0, fontFamily: FONTS.sans, fontWeight: 600, fontSize: stacked ? 60 : 68, color: COLORS.ink }}>
          Kia <span style={{ fontFamily: FONTS.serif, fontStyle: "italic", color: COLORS.accentInk }}>génère</span>…
        </h2>
        <Shimmer />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: stacked ? "column" : "row",
          gap: stacked ? 30 : 50,
          width: "100%",
          maxWidth: 1640,
          alignItems: stacked ? "stretch" : "center",
          justifyContent: "center",
        }}
      >
        {/* Deliverable grid */}
        <div
          style={{
            flex: stacked ? "0 0 auto" : "1 1 50%",
            display: "grid",
            gridTemplateColumns: stacked ? "1fr 1fr" : "1fr 1fr",
            gap: 18,
          }}
        >
          {DELIVERABLES.map((d, i) => (
            <DeliverableCard key={d.label} label={d.label} sub={d.sub} enterFrame={CARD_START + i * CARD_STAGGER} />
          ))}
        </div>

        {/* Code block */}
        <div style={{ flex: stacked ? "0 0 auto" : "1 1 50%", display: "flex" }}>
          <CodeBlock code={CODE_SNIPPET} startFrame={50} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Shimmer: React.FC = () => {
  const frame = useCurrentFrame();
  const x = (frame * 6) % 260;
  return (
    <div
      style={{
        position: "relative",
        marginTop: 18,
        height: 4,
        width: 260,
        borderRadius: 999,
        background: COLORS.line,
        overflow: "hidden",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: x - 90,
          top: 0,
          height: "100%",
          width: 90,
          borderRadius: 999,
          background: COLORS.accent,
        }}
      />
    </div>
  );
};
