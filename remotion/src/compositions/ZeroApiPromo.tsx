import { AbsoluteFill, Audio, interpolate, Series, staticFile } from "remotion";
import { COLORS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Grain } from "../components/Grain";
import { Scene1Intro } from "../scenes/Scene1Intro";
import { Scene2Conversation } from "../scenes/Scene2Conversation";
import { Scene3Generation } from "../scenes/Scene3Generation";
import { Scene4ValueProps } from "../scenes/Scene4ValueProps";
import { Scene5Outro } from "../scenes/Scene5Outro";

export type PromoProps = {
  /** Filename in public/ for the background music. Empty = silent. */
  audioSrc?: string;
};

/** Scene frame budget (30fps) — sums to 900 (30s). */
const SCENES = [
  { dur: 120, El: Scene1Intro },
  { dur: 300, El: Scene2Conversation },
  { dur: 210, El: Scene3Generation },
  { dur: 120, El: Scene4ValueProps },
  { dur: 150, El: Scene5Outro },
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
            interpolate(f, [0, 30, 840, 900], [0, 0.6, 0.6, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
