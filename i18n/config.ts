export const locales = ["fr", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

/** Cookie that persists the visitor's chosen language across requests. */
export const LOCALE_COOKIE = "zeroapi-locale";

/** Message catalogs are split per area so they can be authored independently. */
export const NAMESPACES = [
  "common",
  "landing",
  "auth",
  "legal",
  "dashboard",
  "admin",
  "runtime",
] as const;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};
