/**
 * Single source of truth for ZeroAPI brand tokens, mirrored from
 * app/icon.svg, app/layout.tsx and app/landing.css so the promo matches
 * the product 1:1.
 */
import { Easing } from "remotion";
import { FONT_MONO, FONT_SANS, FONT_SERIF } from "./fonts";

export const COLORS = {
  // Accent
  accent: "#10F083",
  accentInk: "#002914",
  accentSoft: "#E7FBEF",
  accentGlow: "rgba(16, 240, 131, 0.35)",
  // Light surface palette
  bg: "#FAFAF7",
  surface: "#FFFFFF",
  ink: "#0A0A0A",
  muted: "#6E6E68",
  line: "#E5E4DE",
  // Dark (used sparingly, e.g. code block)
  darkSurface: "#161816",
  darkInk: "#F5F6F2",
} as const;

export const FONTS = {
  serif: FONT_SERIF,
  sans: FONT_SANS,
  mono: FONT_MONO,
} as const;

/** House easing — an "expo-out" feel used across the whole piece. */
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** Slightly over-damped spring config — tasteful, not bouncy. */
export const SPRING = { damping: 18, mass: 0.9, stiffness: 120 } as const;

/** Soft elevation that matches the landing's premium surfaces. */
export const SHADOW_MD = "0 10px 30px rgba(10, 10, 10, 0.08)";
export const SHADOW_LG = "0 24px 60px rgba(10, 10, 10, 0.12)";
