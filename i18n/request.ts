import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  NAMESPACES,
  type Locale,
} from "./config";

/** Resolve the active locale: explicit cookie wins, otherwise we negotiate
 *  against the browser's Accept-Language header, falling back to French. */
function resolveLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((part) => part.trim().split(";")[0]?.slice(0, 2).toLowerCase());
    for (const code of preferred) {
      if (isLocale(code)) return code;
    }
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headers().get("accept-language"),
  );

  // Merge the per-area catalogs into a single namespaced message tree.
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      const mod = await import(`../messages/${locale}/${ns}.json`);
      return [ns, mod.default] as const;
    }),
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
  };
});
