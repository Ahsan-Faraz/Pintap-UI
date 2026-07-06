/**
 * Pure translator — usable on the server and the client. Dotted-key lookup with
 * `{param}` interpolation. Falls back to English, then to the key string itself,
 * so a missing key never throws or renders blank.
 */
import en from "@/messages/en.json";
import de from "@/messages/de.json";
import { DEFAULT_LOCALE, type Locale } from "./config";

type Messages = Record<string, unknown>;

const DICTS: Record<Locale, Messages> = { en, de };

function lookup(dict: Messages, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : undefined;
}

function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] != null ? String(params[k]) : `{${k}}`,
  );
}

export type Translator = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export function createTranslator(locale: Locale): Translator {
  const primary = DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
  const fallback = DICTS[DEFAULT_LOCALE];
  return (key, params) => {
    const hit = lookup(primary, key) ?? lookup(fallback, key) ?? key;
    return interpolate(hit, params);
  };
}

/** Simple count-based pluralization helper (en/de share one/other rules). */
export function plural(
  count: number,
  one: string,
  other: string,
): string {
  return count === 1 ? one : other;
}
