"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import Thumb from "@/components/ui/Thumb";
import Skeleton from "@/components/ui/Skeleton";
import Spinner from "@/components/ui/Spinner";
import { CheckCircleIcon, CopyIcon } from "@/components/ui/icons";
import { useLocale, useT } from "@/context/I18nProvider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { useAsync } from "@/lib/hooks";
import { formatPercent } from "@/lib/format";
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

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Prefer store name; fall back to link brand (shown once on the page). */
function resolveStoreLabel(
  storeName: string | null | undefined,
  brand: string | null | undefined,
): string | null {
  const raw = (storeName ?? brand ?? "").trim();
  return raw || null;
}

/** Drop a leading store/brand prefix from the product title when the shop is already shown above. */
function displayProductName(name: string, storeLabel: string | null): string {
  if (!storeLabel) return name;
  const trimmed = name.trim();
  const storeNorm = normalizeLabel(storeLabel);
  if (!storeNorm) return trimmed;

  const separators = /\s*[-–—|:]\s*/;
  const parts = trimmed.split(separators);
  if (parts.length > 1) {
    const headNorm = normalizeLabel(parts[0] ?? "");
    if (
      headNorm === storeNorm ||
      headNorm.startsWith(storeNorm) ||
      storeNorm.startsWith(headNorm)
    ) {
      const rest = parts.slice(1).join(" - ").trim();
      if (rest) return rest;
    }
  }

  if (normalizeLabel(trimmed).startsWith(storeNorm)) {
    const stripped = trimmed
      .slice(storeLabel.length)
      .replace(/^[\s\-–—|:]+/, "")
      .trim();
    if (stripped) return stripped;
  }

  return trimmed;
}

export default function ResolverPageClient() {
  const params = useParams<{ shortcode: string }>();
  const shortcode = params.shortcode;
  const t = useT();
  const { locale } = useLocale();
  const { data, loading, error } = useAsync(
    () => linksService.getResolverView(shortcode),
    [shortcode],
  );
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

  const storeLabel = data
    ? resolveStoreLabel(data.store?.name, data.link?.brand)
    : null;
  const productName =
    data?.link && storeLabel
      ? displayProductName(data.link.name, storeLabel)
      : data?.link?.name ?? "";
  const discountPercent = data?.discountPercent ?? null;
  const hasDiscount = Boolean(data?.discountCode && discountPercent != null);

  return (
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center bg-beige px-4 py-3 text-navy"
    >
      <div className="flex w-full max-w-[390px] flex-1 flex-col">
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-[1.75rem] border border-navy/8 bg-white shadow-[0_24px_60px_rgba(0,46,81,0.14)]",
            "h-[calc(100dvh-4.25rem)] max-h-[780px]",
          )}
        >
          {loading ? (
            <ResolverSkeleton hasDiscount={false} />
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
            <>
              <div
                className={cn(
                  "relative w-full shrink-0 bg-[#EDF0F4]",
                  hasDiscount
                    ? "h-[min(46dvh,360px)]"
                    : "h-[min(58dvh,440px)]",
                )}
              >
                <Thumb
                  src={data.link.imageUrl}
                  alt={productName}
                  fit="cover"
                  className="absolute inset-0 h-full w-full"
                />

                {data.recommenderFirstName ? (
                  <div className="absolute left-3 right-3 top-3 flex items-start gap-2.5 rounded-2xl border border-navy/8 bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,46,81,0.12)] backdrop-blur-sm">
                    <Avatar
                      src={data.recommenderAvatarUrl}
                      name={data.recommenderFirstName}
                      size={32}
                      className="mt-0.5 shrink-0"
                    />
                    <p className="min-w-0 flex-1 text-[15px] leading-snug text-navy/75">
                      <span className="font-bold text-navy">
                        {data.recommenderFirstName}
                      </span>{" "}
                      {t("resolver.recommendsSuffix")}
                    </p>
                  </div>
                ) : null}

                {hasDiscount ? (
                  <DiscountBanner
                    percent={discountPercent!}
                    code={data.discountCode!}
                    locale={locale}
                  />
                ) : null}
              </div>

              <div className="flex min-h-0 flex-1 flex-col justify-between px-4 pb-4 pt-3">
                <div className="min-h-0 space-y-2 overflow-y-auto">
                  {storeLabel ? (
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-navy/40">
                      {storeLabel.toUpperCase()}
                    </p>
                  ) : null}

                  <h1 className="line-clamp-2 text-[15px] font-semibold leading-snug text-navy">
                    {productName}
                  </h1>

                  {hasDiscount ? (
                    <p className="text-lg font-extrabold tabular-nums text-navy">
                      {formatPercent(discountPercent, { locale })}{" "}
                      <span className="text-sm font-bold text-navy/70">
                        {t("resolver.offAtCheckout")}
                      </span>
                    </p>
                  ) : null}

                  {data.terms ? (
                    <div>
                      <p className="text-xs font-bold text-navy/50">
                        {t("resolver.termsWord")}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-navy/60">
                        {data.terms}
                      </p>
                    </div>
                  ) : data.discountCode ? (
                    <p className="text-xs leading-relaxed text-navy/55">
                      {t("resolver.discountReady")}
                    </p>
                  ) : null}

                  <ul className="space-y-1.5 rounded-xl bg-[#F4F6F8] px-3 py-2.5">
                    {data.discountCode ? (
                      <BenefitItem>{t("resolver.benefitAutoApply")}</BenefitItem>
                    ) : null}
                    <BenefitItem>{t("resolver.secureConnection")}</BenefitItem>
                  </ul>
                </div>

                <div className="shrink-0 pt-3">
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={redirecting}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-orange text-[15px] font-bold text-white transition hover:bg-orange/90 focus-ring disabled:opacity-60"
                  >
                    {redirecting ? <Spinner className="h-5 w-5" /> : null}
                    {hasDiscount
                      ? t("resolver.shopWithDiscount", {
                          percent: formatPercent(discountPercent, { locale }),
                        })
                      : t("resolver.shopNow")}
                    <span aria-hidden="true">→</span>
                  </button>

                  <p className="mt-2 text-center text-[10px] leading-relaxed text-navy/40">
                    {t("resolver.poweredByPrefix")}{" "}
                    <span className="font-bold text-navy/55">Pintap</span>
                    {data.recommenderFirstName
                      ? ` · ${t("resolver.commissionFootnote", {
                          name: data.recommenderFirstName,
                        })}`
                      : null}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <ResolverLanguageToggle />
      </div>
    </main>
  );
}

function DiscountBanner({
  percent,
  code,
  locale,
}: {
  percent: number;
  code: string;
  locale: string;
}) {
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
    <div className="absolute inset-x-3 bottom-3 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3 rounded-2xl bg-navy px-3.5 py-3 shadow-[0_12px_32px_rgba(0,46,81,0.28)]">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
          {t("resolver.yourDiscount")}
        </p>
        <p className="text-xl font-extrabold leading-none text-white">
          {formatPercent(percent, { locale: locale === "de" ? "de" : "en" })}
        </p>
      </div>
      <div className="min-w-0 text-right">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
          {t("resolver.couponCode")}
        </p>
        <button
          type="button"
          onClick={copy}
          className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-dashed border-white/45 bg-white/5 px-2.5 py-1.5 transition hover:bg-white/10 focus-ring"
        >
          <code className="truncate text-xs font-bold tracking-wide text-white">
            {code}
          </code>
          <CopyIcon className="h-3.5 w-3.5 shrink-0 text-white/80" />
          <span className="sr-only">
            {copied ? t("common.copied") : t("resolver.copy")}
          </span>
        </button>
      </div>
    </div>
  );
}

function BenefitItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-xs text-navy/65">
      <CheckCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#086838]" />
      <span>{children}</span>
    </li>
  );
}

function ResolverLanguageToggle() {
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <div className="mx-auto mt-3 flex shrink-0 justify-center pb-1">
      <div
        className="inline-flex items-center gap-1 rounded-full border border-navy/10 bg-white/70 px-2 py-1"
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
              "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] transition focus-ring",
              locale === loc
                ? "bg-navy/10 text-navy"
                : "text-navy/40 hover:text-navy/65",
            )}
          >
            {LOCALE_LABELS[loc].short}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResolverSkeleton({ hasDiscount }: { hasDiscount: boolean }) {
  return (
    <>
      <Skeleton
        className={cn(
          "w-full shrink-0 rounded-none",
          hasDiscount ? "h-[min(46dvh,360px)]" : "h-[min(58dvh,440px)]",
        )}
      />
      <div className="flex flex-1 flex-col justify-between px-4 py-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </>
  );
}

function StateBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-lg font-extrabold text-navy">{title}</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-navy/60">{body}</p>
    </div>
  );
}
