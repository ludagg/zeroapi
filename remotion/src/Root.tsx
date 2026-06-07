import { Composition, continueRender, delayRender } from "remotion";
import { useEffect, useState } from "react";
import { ZeroApiPromo } from "./compositions/ZeroApiPromo";
import { fontsReady } from "./fonts";

const FPS = 30;
const DURATION = 1740; // 58s

/**
 * Set to a filename in public/ to add a royalty-free music bed
 * (e.g. "bgm.mp3"). Leave empty to render silent — the promo reads
 * perfectly without sound.
 */
const AUDIO_SRC = "";

/** Blocks the first frame until every brand glyph is ready. */
const useFontsReady = () => {
  const [handle] = useState(() => delayRender("Loading brand fonts"));
  useEffect(() => {
    fontsReady.then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
};

export const Root: React.FC = () => {
  useFontsReady();
  const common = {
    component: ZeroApiPromo,
    durationInFrames: DURATION,
    fps: FPS,
    defaultProps: { audioSrc: AUDIO_SRC },
  } as const;

  return (
    <>
      <Composition id="ZeroApiPromoLandscape" {...common} width={1920} height={1080} />
      <Composition id="ZeroApiPromoVertical" {...common} width={1080} height={1920} />
      <Composition id="ZeroApiPromoSquare" {...common} width={1080} height={1080} />
    </>
  );
};
