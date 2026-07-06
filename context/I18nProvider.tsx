"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/translate";

interface I18nValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Translator;
}

const I18nContext = createContext<I18nValue | undefined>(undefined);

/**
 * Provides the active locale + translator to client components. Seeded from the
 * server (cookie) so the first render matches SSR. Switching writes the cookie,
 * updates client state instantly, and refreshes server components.
 */
export default function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      setLocaleState(next);
      // Re-render server components (layouts, server pages) with the new cookie.
      router.refresh();
    },
    [router],
  );

  const t = useMemo(() => createTranslator(locale), [locale]);
  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

/** The translator for the active locale. */
export function useT(): Translator {
  return useI18n().t;
}

/** The active locale + a setter. */
export function useLocale(): { locale: Locale; setLocale: (next: Locale) => void } {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}
