"use client";

import { useEffect, useState } from "react";
import { useLocale, useT } from "@/context/I18nProvider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { GlobeIcon } from "./icons";
import { cn } from "@/lib/utils";

/** Navbar language switcher (EN / DE), per the Pintap Studio spec. */
export default function LanguageSwitcher({
  className,
}: {
  className?: string;
}) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(next: Locale) {
    if (next !== locale) setLocale(next);
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language.switch")}
        className="inline-flex items-center gap-2 rounded-full border border-navy/20 bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-navy transition hover:border-navy/40 focus-ring"
      >
        <GlobeIcon className="h-4 w-4" />
        {LOCALE_LABELS[locale].short}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-11 z-50 w-44 origin-top-right animate-dropdown-in rounded-xl border border-navy/10 bg-surface p-1.5 shadow-[0_16px_30px_rgba(0,46,81,0.14)]"
            role="menu"
          >
            {LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                role="menuitemradio"
                aria-checked={loc === locale}
                onClick={() => choose(loc)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition hover:bg-beige/60",
                  loc === locale ? "text-navy" : "text-navy/75",
                )}
              >
                {LOCALE_LABELS[loc].label}
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-navy/45">
                  {LOCALE_LABELS[loc].short}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
