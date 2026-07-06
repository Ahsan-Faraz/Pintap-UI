"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { campaignsService } from "@/services";
import type { CampaignSummary } from "@/lib/types";
import { formatDate, formatPercent } from "@/lib/format";

export default function AdminCampaignsPage() {
  const { toast } = useToast();
  const t = useT();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, loading, reload } = useAsync(
    () => campaignsService.listCampaigns(),
    [],
  );

  async function stop(c: CampaignSummary) {
    setBusyId(c.id);
    try {
      await campaignsService.stopCampaign(c.id);
      toast({ title: t("adminPages.campaigns.stopped"), variant: "success" });
      reload();
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<CampaignSummary>[] = [
    {
      key: "name",
      header: t("links.campaign"),
      sortAccessor: (c) => c.name,
      render: (c) => (
        <div>
          <p className="font-semibold text-navy">{c.name}</p>
          <p className="text-xs text-navy/50">{c.store?.name}</p>
        </div>
      ),
    },
    {
      key: "discount",
      header: t("adminPages.campaigns.discountShort"),
      align: "right",
      sortAccessor: (c) => c.discountPercent ?? 0,
      render: (c) => formatPercent(c.discountPercent),
    },
    {
      key: "commission",
      header: t("adminPages.campaigns.commissionShort"),
      align: "right",
      sortAccessor: (c) => c.commissionPercent ?? 0,
      render: (c) => formatPercent(c.commissionPercent),
    },
    {
      key: "codes",
      header: t("merchantPages.campaigns.codes"),
      align: "right",
      render: (c) => `${c.codesAvailable}/${c.codesTotal}`,
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
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) =>
        c.status === "active" ? (
          <Button
            size="sm"
            variant="ghost"
            loading={busyId === c.id}
            onClick={() => stop(c)}
          >
            {t("adminPages.campaigns.stop")}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("merchantPages.campaigns.title")}
        description={t("adminPages.campaigns.description")}
      />
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DataTable
          columns={columns}
          rows={data ?? []}
          getRowKey={(c) => c.id}
          searchAccessor={(c) => `${c.name} ${c.store?.name}`}
          searchPlaceholder={t("merchantPages.campaigns.search")}
        />
      )}
    </div>
  );
}
