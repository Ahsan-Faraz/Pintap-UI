/** Formatting helpers. Money is stored in integer minor units (cents). */

import { DEFAULT_CURRENCY } from "@/lib/currency";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

type IntlLocale = "en-US" | "de-DE";

function currentLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return cookie === "de" ? "de" : "en";
}

function intlLocale(locale = currentLocale()): IntlLocale {
  return locale === "de" ? "de-DE" : "en-US";
}

export function formatCurrencyMinor(
  minor: number,
  currency = DEFAULT_CURRENCY,
  opts: { compact?: boolean; locale?: Locale } = {},
): string {
  const amount = (minor ?? 0) / 100;
  try {
    return new Intl.NumberFormat(intlLocale(opts.locale), {
      style: "currency",
      currency,
      notation: opts.compact ? "compact" : "standard",
      maximumFractionDigits: opts.compact ? 1 : 2,
    }).format(amount);
  } catch {
    // Unknown currency code — fall back to a plain prefixed number.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatNumber(
  n: number,
  opts: { compact?: boolean; locale?: Locale } = {},
): string {
  return new Intl.NumberFormat(intlLocale(opts.locale), {
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n ?? 0);
}

export function formatPercent(
  n: number | null | undefined,
  opts: { locale?: Locale } = {},
): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat(intlLocale(opts.locale), {
    maximumFractionDigits: 1,
  }).format(n)}%`;
}

export function formatDate(
  iso: string | null | undefined,
  opts: { locale?: Locale } = {},
): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(intlLocale(opts.locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(
  iso: string | null | undefined,
  opts: { locale?: Locale } = {},
): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(intlLocale(opts.locale), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact relative time, e.g. "3d ago". */
export function formatRelative(
  iso: string | null | undefined,
  opts: { locale?: Locale } = {},
): string {
  if (!iso) return "—";
  const locale = opts.locale ?? currentLocale();
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return locale === "de" ? "gerade eben" : "just now";
  if (mins < 60) return locale === "de" ? `vor ${mins} Min.` : `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return locale === "de" ? `vor ${hrs} Std.` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return locale === "de" ? `vor ${days} Tg.` : `${days}d ago`;
  return formatDate(iso, { locale });
}
