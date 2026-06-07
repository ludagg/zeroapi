/**
 * Loads the three brand fonts from self-hosted woff2 files in public/fonts/
 * (latin subset, covers French accents). Self-hosting means the render needs
 * NO font network — important in sandboxes where the headless browser can't
 * reach fonts.gstatic.com. Mirrors app/layout.tsx weights/styles.
 */
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

type Face = { family: string; weight: string; style: string; file: string };

const FACES: Face[] = [
  { family: "Instrument Serif", weight: "400", style: "italic", file: "fonts/InstrumentSerif-400-italic.woff2" },
  { family: "Instrument Serif", weight: "400", style: "normal", file: "fonts/InstrumentSerif-400-normal.woff2" },
  { family: "JetBrains Mono", weight: "400", style: "normal", file: "fonts/JetBrainsMono-400-normal.woff2" },
  { family: "JetBrains Mono", weight: "500", style: "normal", file: "fonts/JetBrainsMono-500-normal.woff2" },
  { family: "JetBrains Mono", weight: "600", style: "normal", file: "fonts/JetBrainsMono-600-normal.woff2" },
  { family: "Space Grotesk", weight: "400", style: "normal", file: "fonts/SpaceGrotesk-400-normal.woff2" },
  { family: "Space Grotesk", weight: "500", style: "normal", file: "fonts/SpaceGrotesk-500-normal.woff2" },
  { family: "Space Grotesk", weight: "600", style: "normal", file: "fonts/SpaceGrotesk-600-normal.woff2" },
  { family: "Space Grotesk", weight: "700", style: "normal", file: "fonts/SpaceGrotesk-700-normal.woff2" },
];

export const FONT_SERIF = "Instrument Serif";
export const FONT_SANS = "Space Grotesk";
export const FONT_MONO = "JetBrains Mono";

/** Resolves once every glyph is ready — awaited in Root via delayRender. */
export const fontsReady = Promise.all(
  FACES.map((f) =>
    loadFont({
      family: f.family,
      url: staticFile(f.file),
      weight: f.weight,
      style: f.style,
    }),
  ),
);
