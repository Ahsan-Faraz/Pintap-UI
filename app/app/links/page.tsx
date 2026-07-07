"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import LinkCard from "@/components/recommender/LinkCard";
import LinkPreviewModal from "@/components/recommender/LinkPreviewModal";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { linksService } from "@/services";
import type {
  LinkListFilters,
  LinkStatus,
  LinkSummary,
  SortOrder,
} from "@/lib/types";

type StatusFilter = "default" | LinkStatus;

export default function MyLinksPage() {
  const t = useT();
  const [sort, setSort] = useState<SortOrder>("newest");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [campaign, setCampaign] =
    useState<NonNullable<LinkListFilters["campaign"]>>("all");
  const [selectedLink, setSelectedLink] = useState<LinkSummary | null>(null);

  const { data: links, loading } = useAsync(
    () =>
      linksService.listMyLinks({
        sort,
        campaign,
        status: status === "default" ? undefined : status,
      }),
    [sort, status, campaign],
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t("appPages.links.title")} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          name="links-sort"
          aria-label={t("appPages.links.sortLabel")}
          autoComplete="off"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOrder)}
        >
          <option value="newest">{t("appPages.links.sortNewest")}</option>
          <option value="oldest">{t("appPages.links.sortOldest")}</option>
          <option value="name">{t("appPages.links.sortName")}</option>
        </Select>
        <Select
          name="links-status"
          aria-label={t("appPages.links.filterStatus")}
          autoComplete="off"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="active">{t("appPages.links.statusActive")}</option>
          <option value="deleted">{t("status.deleted")}</option>
        </Select>
        <Select
          name="links-campaign"
          aria-label={t("appPages.links.filterCampaign")}
          autoComplete="off"
          value={campaign}
          onChange={(e) =>
            setCampaign(e.target.value as NonNullable<LinkListFilters["campaign"]>)
          }
        >
          <option value="all">{t("appPages.links.campaignAll")}</option>
          <option value="connected">{t("appPages.links.campaignConnected")}</option>
          <option value="unconnected">{t("links.noCampaign")}</option>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[248px] rounded-card" />
          ))}
        </div>
      ) : !links || links.length === 0 ? (
        <EmptyState
          title={t("appPages.links.noMatchTitle")}
          description={t("appPages.links.noMatchDescription")}
          action={
            <Link href="/app/create-link" className={buttonClasses({})}>
              {t("dashboard.user.createLink")}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <LinkCard
              key={l.id}
              link={l}
              onSelect={setSelectedLink}
              variant="rail"
            />
          ))}
        </div>
      )}

      <LinkPreviewModal
        link={selectedLink}
        open={Boolean(selectedLink)}
        onClose={() => setSelectedLink(null)}
      />
    </div>
  );
}
