import { AbsoluteFill, Audio, interpolate, Series, staticFile } from "remotion";
import { COLORS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Grain } from "../components/Grain";
import { Scene1Intro } from "../scenes/Scene1Intro";
import { Scene2Conversation } from "../scenes/Scene2Conversation";
import { Scene3Generation } from "../scenes/Scene3Generation";
import { Scene4Dashboard } from "../scenes/Scene4Dashboard";
import { Scene5Platform } from "../scenes/Scene5Platform";
import { Scene4ValueProps } from "../scenes/Scene4ValueProps";
import { Scene5Outro } from "../scenes/Scene5Outro";

export type PromoProps = {
  /** Filename in public/ for the background music. Empty = silent. */
  audioSrc?: string;
};

/** Scene frame budget (30fps) — sums to 1530 (51s). */
const SCENES = [
  { dur: 120, El: Scene1Intro }, // 0–120   hook
  { dur: 300, El: Scene2Conversation }, // 120–420  describe the API to Kia
  { dur: 210, El: Scene3Generation }, // 420–630  Kia generates the backend
  { dur: 240, El: Scene4Dashboard }, // 630–870  it runs live — data graphs
  { dur: 240, El: Scene5Platform }, // 870–1110 multi-IA failover + deploy
  { dur: 180, El: Scene4ValueProps }, // 1110–1290 value props
  { dur: 240, El: Scene5Outro }, // 1290–1530 CTA
];

export const ZeroApiPromo: React.FC<PromoProps> = ({ audioSrc }) => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Backdrop />

      <Series>
        {SCENES.map(({ dur, El }, i) => (
          <Series.Sequence key={i} durationInFrames={dur}>
            <El />
          </Series.Sequence>
        ))}
      </Series>

      <Grain opacity={0.045} />

      {audioSrc ? (
        <Audio
          src={staticFile(audioSrc)}
          volume={(f) =>
            interpolate(f, [0, 30, 1470, 1530], [0, 0.6, 0.6, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
