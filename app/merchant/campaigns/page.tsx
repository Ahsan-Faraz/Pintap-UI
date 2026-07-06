"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Skeleton from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { useAsync } from "@/lib/hooks";
import { campaignsService } from "@/services";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import { useT } from "@/context/I18nProvider";
import type { CampaignSummary } from "@/lib/types";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

export default function MerchantCampaignsPage() {
  const router = useRouter();
  const t = useT();
  const { store, loading: storeLoading } = useMerchantStore();
  const storeId = store?.id;

  const { data, loading } = useAsync(
    () =>
      storeId
        ? campaignsService.listCampaignsForStore(storeId)
        : Promise.resolve([]),
    [storeId],
  );

  if (storeLoading) return <Skeleton className="h-64 w-full" />;
  if (!store) {
    return (
      <div>
        <PageHeader title={t("merchantPages.campaigns.title")} />
        <NoStore />
      </div>
    );
  }

  const rows = data ?? [];
  const active = rows.filter((c) => c.status === "active").length;
  const totalCodes = rows.reduce((s, c) => s + c.codesTotal, 0);

  const columns: Column<CampaignSummary>[] = [
    {
      key: "name",
      header: t("links.campaign"),
      sortAccessor: (c) => c.name,
      render: (c) => (
        <div>
          <p className="font-semibold text-navy">{c.name}</p>
          <p className="line-clamp-1 text-xs text-navy/50">{c.terms}</p>
        </div>
      ),
    },
    {
      key: "discount",
      header: t("merchantPages.campaignForm.discount"),
      align: "right",
      sortAccessor: (c) => c.discountPercent ?? 0,
      render: (c) => formatPercent(c.discountPercent),
    },
    {
      key: "commission",
      header: t("merchantPages.campaignForm.commission"),
      align: "right",
      sortAccessor: (c) => c.commissionPercent ?? 0,
      render: (c) => formatPercent(c.commissionPercent),
    },
    {
      key: "codes",
      header: t("merchantPages.campaigns.codes"),
      align: "right",
      sortAccessor: (c) => c.codesAvailable,
      render: (c) => (
        <span>
          {c.codesAvailable}
          <span className="text-navy/40"> / {c.codesTotal}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: t("orders.status"),
      sortAccessor: (c) => c.status,
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "updated",
      header: t("orders.updated"),
      align: "right",
      sortAccessor: (c) => c.updatedAt,
      render: (c) => formatDate(c.updatedAt),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("merchantPages.campaigns.title")}
        actions={
          <Link href="/merchant/campaigns/new" className={buttonClasses({})}>
            {t("merchantPages.campaigns.new")}
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-3 sm:max-w-lg">
        <KpiCard label={t("merchantPages.campaigns.total")} value={formatNumber(rows.length)} />
        <KpiCard label={t("merchantPages.campaigns.active")} value={formatNumber(active)} accent="green" />
        <KpiCard label={t("merchantPages.campaigns.codes")} value={formatNumber(totalCodes)} />
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(c) => c.id}
          searchAccessor={(c) => `${c.name} ${c.terms}`}
          searchPlaceholder={t("merchantPages.campaigns.search")}
          onRowClick={(c) => router.push(`/merchant/campaigns/${c.id}`)}
          emptyTitle={t("merchantPages.campaigns.emptyTitle")}
          emptyDescription={t("merchantPages.campaigns.emptyDescription")}
        />
      )}
    </div>
  );
}
