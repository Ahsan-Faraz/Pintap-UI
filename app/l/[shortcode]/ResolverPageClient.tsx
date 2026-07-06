"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Avatar from "@/components/ui/Avatar";
import Thumb from "@/components/ui/Thumb";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import { useLocale, useT } from "@/context/I18nProvider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { useAsync } from "@/lib/hooks";
import { linksService } from "@/services";
import { cn } from "@/lib/utils";

const VISITOR_KEY = "pintap_vh";

function visitorHash(): string {
  if (typeof window === "undefined") return "";
  let hash = localStorage.getItem(VISITOR_KEY);
  if (!hash) {
    hash = `vh_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(VISITOR_KEY, hash);
  }
  return hash;
}

export default function ResolverPageClient() {
  const params = useParams<{ shortcode: string }>();
  const shortcode = params.shortcode;
  const t = useT();
  const { data, loading, error } = useAsync(
    () => linksService.getResolverView(shortcode),
    [shortcode],
  );
  const [termsOpen, setTermsOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  function handleContinue() {
    if (!data?.link) return;
    setRedirecting(true);
    void linksService.recordClick(shortcode, {
      visitorHash: visitorHash(),
      source: "resolver",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
    window.location.href = data.link.redirectUrl;
  }

  const brandLine = [data?.link?.brand, data?.store?.name]
    .filter(Boolean)
    .join(" · ");

  const termsPreview =
    data?.terms?.trim().slice(0, 24) ||
    t("resolver.termsFallback");

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-beige px-4 py-10 text-navy"
    >
      <div className="w-full max-w-[380px]">
        <div className="relative">
          {!loading && data?.recommenderFirstName ? (
            <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-navy/10 bg-surface px-3.5 py-2 shadow-[0_8px_24px_rgba(0,46,81,0.12)]">
              <Avatar
                src={data.recommenderAvatarUrl}
                name={data.recommenderFirstName}
                size={24}
                className="ring-2 ring-navy/10"
              />
              <span className="text-[13px] text-navy/55">
                <span className="font-bold text-navy">
                  {data.recommenderFirstName}
                </span>{" "}
                {t("resolver.recommendsSuffix")}
              </span>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[1.75rem] border border-navy/10 bg-surface shadow-[0_24px_60px_rgba(0,46,81,0.16)]">
            {loading ? (
              <ResolverSkeleton />
            ) : error ? (
              <StateBlock
                title={t("resolver.temporaryTitle")}
                body={t("resolver.temporaryBody")}
              />
            ) : !data?.found || !data.link ? (
              <StateBlock
                title={t("resolver.unavailableTitle")}
                body={t("resolver.unavailableBody")}
              />
            ) : (
              <div className="px-6 pb-7 pt-10">
                <div className="mb-6 flex justify-center">
                  <Logo className="[&_img]:h-10" />
                </div>

                <div className="mx-auto mb-5 h-[104px] w-[104px] overflow-hidden rounded-[1.5rem] border border-navy/10 bg-white">
                  <Thumb
                    src={data.link.imageUrl}
                    alt={data.link.name}
                    fit="contain"
                    className="h-full w-full p-1"
                  />
                </div>

                {brandLine ? (
                  <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-navy/45">
                    {brandLine}
                  </p>
                ) : null}

                <h1 className="mt-2.5 text-center text-[1.75rem] font-extrabold leading-tight text-navy">
                  {data.link.name}
                </h1>

                {data.discountCode ? (
                  <p className="mt-2.5 text-center text-sm text-navy/55">
                    {t("resolver.discountReady")}
                  </p>
                ) : null}

                <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                  <span className="text-navy/60">
                    <span className="font-bold text-navy">
                      {t("resolver.termsWord")}
                    </span>{" "}
                    {termsPreview}
                  </span>
                  {data.terms ? (
                    <button
                      type="button"
                      onClick={() => setTermsOpen((open) => !open)}
                      aria-expanded={termsOpen}
                      className="rounded-input font-medium text-navy/50 transition hover:text-navy focus-ring"
                    >
                      {termsOpen
                        ? t("resolver.hideAll")
                        : t("resolver.seeAll")}
                    </button>
                  ) : null}
                </div>

                {termsOpen && data.terms ? (
                  <p className="mt-2 text-xs leading-relaxed text-navy/60">
                    {data.terms}
                  </p>
                ) : null}

                {data.discountCode ? (
                  <DiscountCodeBox code={data.discountCode} />
                ) : null}

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={redirecting}
                  className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-coral text-base font-bold text-white transition hover:bg-coral/90 focus-ring disabled:opacity-60"
                >
                  {redirecting ? <Spinner className="h-5 w-5" /> : null}
                  {t("resolver.continue")}
                </button>

                <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-navy/45">
                  <ShieldIcon />
                  {t("resolver.secureConnection")}
                </p>
              </div>
            )}
          </div>
        </div>

        <ResolverFooter />
      </div>
    </main>
  );
}

function DiscountCodeBox({ code }: { code: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* Clipboard may be unavailable. */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-navy/10 bg-beige/60 px-5 py-4">
      <code className="min-w-0 flex-1 truncate text-lg font-bold tracking-wider text-navy">
        {code}
      </code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-navy/55 transition hover:bg-navy/5 hover:text-navy focus-ring"
      >
        <CopyIcon />
        {copied ? t("common.copied") : t("resolver.copy")}
      </button>
    </div>
  );
}

function ResolverFooter() {
  const t = useT();

  return (
    <footer className="mt-8 space-y-4 text-center">
      <ResolverLanguageToggle />
      <p className="text-[13px] text-navy/45">
        {t("resolver.poweredByPrefix")}{" "}
        <span className="font-bold text-navy/80">Pintap</span>
      </p>
      <div className="flex items-center justify-center gap-3 text-[13px] font-medium text-navy/55">
        <a
          href="https://www.pintap.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-input transition hover:text-navy focus-ring"
        >
          {t("resolver.whatIsThis")}
        </a>
      </div>
    </footer>
  );
}

function ResolverLanguageToggle() {
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <div className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-navy/15 bg-surface px-4 py-2">
      <GlobeIcon />
      <span className="text-[13px] font-medium text-navy/55">
        {t("language.label")}
      </span>
      <div
        className="inline-flex items-center gap-1"
        role="radiogroup"
        aria-label={t("language.switch")}
      >
        {LOCALES.map((loc) => (
          <button
            key={loc}
            type="button"
            role="radio"
            aria-checked={locale === loc}
            onClick={() => setLocale(loc)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] transition focus-ring",
              locale === loc
                ? "bg-navy/10 text-navy"
                : "text-navy/45 hover:text-navy/70",
            )}
          >
            {LOCALE_LABELS[loc].short}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResolverSkeleton() {
  return (
    <div className="px-6 pb-7 pt-10">
      <Skeleton className="mx-auto mb-6 h-10 w-36 rounded-input" />
      <Skeleton className="mx-auto mb-5 h-[104px] w-[104px] rounded-[1.5rem]" />
      <Skeleton className="mx-auto h-3 w-40" />
      <Skeleton className="mx-auto mt-3 h-7 w-56" />
      <Skeleton className="mt-5 h-12 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-14 w-full rounded-full" />
    </div>
  );
}

function StateBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <h1 className="text-lg font-extrabold text-navy">{title}</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-navy/60">{body}</p>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-navy/45"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
    </svg>
  );
}
