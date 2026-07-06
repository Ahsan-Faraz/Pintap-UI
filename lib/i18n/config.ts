/** i18n configuration — locales, cookie, and display labels. */

export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie the locale is stored in (readable on server + client → no hydration mismatch). */
export const LOCALE_COOKIE = "pintap.locale";

export const LOCALE_LABELS: Record<Locale, { label: string; short: string }> = {
  en: { label: "English", short: "EN" },
  de: { label: "Deutsch", short: "DE" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "de";
}
