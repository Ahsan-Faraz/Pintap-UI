"use client";

import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import { EuroIcon } from "@/components/ui/icons";
import Card, { Section } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useAsync } from "@/lib/hooks";
import { analyticsService, storesService } from "@/services";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import { useT } from "@/context/I18nProvider";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { formatCurrencyMinor, formatDate } from "@/lib/format";

export default function MerchantBillingPage() {
  const t = useT();
  const { store, loading: storeLoading } = useMerchantStore();
  const storeId = store?.id;
  const currency = store?.currency ?? DEFAULT_CURRENCY;

  const { data, loading } = useAsync(async () => {
    if (!storeId) return null;
    const [kpis, funding, fundingState] = await Promise.all([
      analyticsService.getMerchantKpis(storeId),
      storesService.listFunding(storeId),
      storesService.getFundingState(storeId),
    ]);
    return { kpis, funding, fundingState };
  }, [storeId]);

  if (storeLoading) return <Skeleton className="h-64 w-full" />;
  if (!store) {
    return (
      <div>
        <PageHeader title={t("merchantPages.billing.shortTitle")} />
        <NoStore />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("merchantPages.billing.title")}
        description={t("merchantPages.billing.description")}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <KpiCard
          label={t("merchantPages.billing.fundedBalance")}
          value={data ? formatCurrencyMinor(data.kpis.fundedBalanceMinor, currency) : "—"}
          icon={<EuroIcon />}
          loading={loading}
          accent="green"
        />
        <KpiCard
          label={t("merchantPages.billing.commissionOwed")}
          value={data ? formatCurrencyMinor(data.kpis.commissionOwedMinor, currency) : "—"}
          icon={<EuroIcon />}
          loading={loading}
          accent="orange"
        />
        <Card className="flex flex-col justify-center p-5">
          <p className="text-sm font-medium text-navy/60">
            {t("merchantPages.billing.fundingState")}
          </p>
          <div className="mt-2">
            {data ? (
              <StatusBadge status={data.fundingState} />
            ) : (
              "—"
            )}
          </div>
        </Card>
      </div>

      <Section title={t("merchantPages.billing.history")}>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : !data || data.funding.length === 0 ? (
          <EmptyState title={t("merchantPages.billing.empty")} />
        ) : (
          <div className="divide-y divide-stroke">
            {data.funding.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {formatCurrencyMinor(f.amountMinor, f.currency)}
                  </p>
                  <p className="text-xs text-navy/50">{formatDate(f.createdAt)}</p>
                </div>
                <StatusBadge status={f.status} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
