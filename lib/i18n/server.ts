import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, isLocale, type Locale } from "./config";
import { createTranslator, type Translator } from "./translate";

/**
 * Best supported locale from the Accept-Language header, or null.
 * Entries come ordered by the browser; q-values refine that order.
 */
function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim().match(/^q=([\d.]+)$/)?.[1])
        .find(Boolean);
      return { tag: tag.toLowerCase(), q: q ? parseFloat(q) : 1, index };
    })
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    const match = LOCALES.find((l) => l === tag || l === base);
    if (match) return match;
  }
  return null;
}

/**
 * Current locale (server components only): explicit cookie choice first,
 * then the browser's Accept-Language, then the default.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(value)) return value;
  const accept = (await headers()).get("accept-language");
  return localeFromAcceptLanguage(accept) ?? DEFAULT_LOCALE;
}

/** Translator bound to the request locale (server components only). */
export async function getServerT(): Promise<Translator> {
  return createTranslator(await getLocale());
}
