"use client";

import PageHeader from "@/components/ui/PageHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/Badge";
import Thumb from "@/components/ui/Thumb";
import Skeleton from "@/components/ui/Skeleton";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { storesService } from "@/services";
import type { StoreSummary } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function AdminStoresPage() {
  const t = useT();
  const { data, loading } = useAsync(() => storesService.listStores(), []);

  const columns: Column<StoreSummary>[] = [
    {
      key: "store",
      header: t("orders.store"),
      sortAccessor: (s) => s.name,
      render: (s) => (
        <div className="flex items-center gap-3">
          <Thumb src={s.logoUrl} alt={s.name} className="h-9 w-9 rounded-input" />
          <div>
            <p className="font-semibold text-navy">{s.name}</p>
            <p className="text-xs text-navy/50">{s.category ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "domain",
      header: t("orders.domain"),
      render: (s) => (
        <span className="text-navy/70">{s.primaryDomain ?? "—"}</span>
      ),
    },
    { key: "country", header: t("orders.country"), render: (s) => s.countryCode ?? "—" },
    {
      key: "status",
      header: t("orders.status"),
      sortAccessor: (s) => s.status,
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: "campaigns",
      header: t("dashboard.admin.activeCampaigns"),
      align: "right",
      sortAccessor: (s) => s.activeCampaignCount,
      render: (s) => s.activeCampaignCount,
    },
    {
      key: "updated",
      header: t("orders.updated"),
      align: "right",
      sortAccessor: (s) => s.updatedAt,
      render: (s) => formatDate(s.updatedAt),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("adminPages.stores.title")}
        description={t("adminPages.stores.description")}
      />
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DataTable
          columns={columns}
          rows={data ?? []}
          getRowKey={(s) => s.id}
          searchAccessor={(s) => `${s.name} ${s.primaryDomain} ${s.category}`}
          searchPlaceholder={t("adminPages.stores.search")}
        />
      )}
    </div>
  );
}
