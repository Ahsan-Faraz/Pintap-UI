"use client";

import DashboardHeroPattern from "@/components/recommender/DashboardHeroPattern";
import Skeleton from "@/components/ui/Skeleton";
import { formatCurrencyMinor } from "@/lib/format";
import { MIN_PAYOUT_MINOR } from "@/lib/currency";

export default function PayoutBalanceCard({
  availableMinor,
  currency,
  loading,
  labels,
  onRequestPayout,
  onBankDetails,
  requesting,
  canRequest,
  showActions = true,
}: {
  availableMinor: number;
  currency: string;
  loading?: boolean;
  labels: {
    availableBalance: string;
    thresholdRemaining: (remaining: string, threshold: string) => string;
    thresholdReady: string;
    requestPayout: string;
    bankDetails: string;
  };
  onRequestPayout?: () => void;
  onBankDetails?: () => void;
  requesting?: boolean;
  canRequest?: boolean;
  /** When false, only balance + progress (desktop uses separate action row). */
  showActions?: boolean;
}) {
  const atOrAboveMinimum = availableMinor >= MIN_PAYOUT_MINOR;
  const progressPct = atOrAboveMinimum
    ? 100
    : Math.min(100, Math.round((availableMinor / MIN_PAYOUT_MINOR) * 100));
  const remainingMinor = Math.max(0, MIN_PAYOUT_MINOR - availableMinor);
  const thresholdLabel = formatCurrencyMinor(MIN_PAYOUT_MINOR, currency);

  return (
    <div
      className={`dashboard-hero-card relative flex flex-col overflow-hidden p-5 sm:p-8 ${
        showActions ? "min-h-[264px] sm:min-h-[308px]" : "min-h-[200px] sm:min-h-[220px]"
      }`}
    >
      <DashboardHeroPattern />

      <div className="relative">
        <p className="text-sm font-semibold text-white/70 sm:text-base">
          {labels.availableBalance}
        </p>
        {loading ? (
          <Skeleton className="mt-2 h-12 w-40 bg-white/20 sm:h-14" />
        ) : (
          <p className="mt-1 font-light leading-none tracking-tight text-4xl text-white sm:text-5xl">
            {formatCurrencyMinor(availableMinor, currency)}
          </p>
        )}
      </div>

      <div className={`relative space-y-2 ${showActions ? "mt-6" : "mt-auto pt-6"}`}>
        <div className="flex items-end justify-between gap-3">
          <p className="text-sm text-white/65">
            {loading
              ? "…"
              : atOrAboveMinimum
                ? labels.thresholdReady
                : labels.thresholdRemaining(
                    formatCurrencyMinor(remainingMinor, currency),
                    thresholdLabel,
                  )}
          </p>
          {!loading && (
            <span className="text-sm font-bold text-green">{progressPct}%</span>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-green transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {showActions && onRequestPayout && onBankDetails ? (
        <div className="relative mt-auto grid grid-cols-2 gap-3 pt-8">
          <button
            type="button"
            onClick={onRequestPayout}
            disabled={!canRequest || requesting || loading}
            className="inline-flex h-11 items-center justify-center rounded-input bg-orange px-4 text-sm font-bold text-white shadow-sm transition hover:bg-orange/90 focus-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {labels.requestPayout}
          </button>
          <button
            type="button"
            onClick={onBankDetails}
            className="inline-flex h-11 items-center justify-center rounded-input border border-white/45 bg-transparent px-4 text-sm font-semibold text-white transition hover:bg-white/10 focus-ring"
          >
            {labels.bankDetails}
          </button>
        </div>
      ) : null}
    </div>
  );
}
