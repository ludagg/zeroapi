import { interpolate } from "remotion";

/**
 * Returns the substring of `text` that should be visible at `frame`, typing in
 * at `cps` characters per second starting at `startFrame`.
 */
export function typewriter(
  text: string,
  frame: number,
  startFrame: number,
  fps: number,
  cps = 30,
): string {
  const chars = Math.round(
    interpolate(
      frame,
      [startFrame, startFrame + (text.length / cps) * fps],
      [0, text.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );
  return text.slice(0, chars);
}

/** True once the typewriter for `text` has finished. */
export function typedDone(
  text: string,
  frame: number,
  startFrame: number,
  fps: number,
  cps = 30,
): boolean {
  return frame >= startFrame + (text.length / cps) * fps;
}
