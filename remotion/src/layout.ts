import { useVideoConfig } from "remotion";

export type Orientation = "landscape" | "vertical" | "square";

/** Picks a layout bucket from the composition dimensions. */
export function useOrientation(): Orientation {
  const { width, height } = useVideoConfig();
  const ratio = width / height;
  if (ratio > 1.2) return "landscape";
  if (ratio < 0.85) return "vertical";
  return "square";
}
