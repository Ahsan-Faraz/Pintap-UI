"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/Button";
import FilterDropdown from "@/components/ui/FilterDropdown";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import LinkCard from "@/components/recommender/LinkCard";
import LinkPreviewModal from "@/components/recommender/LinkPreviewModal";
import MyLinksDesktop from "@/components/recommender/MyLinksDesktop";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { linksService } from "@/services";
import type {
  LinkListFilters,
  LinkSummary,
  SortOrder,
} from "@/lib/types";

type StatusFilter = "existing" | "deleted";

export default function MyLinksPage() {
  const t = useT();
  const [sort, setSort] = useState<SortOrder>("newest");
  const [status, setStatus] = useState<StatusFilter>("existing");
  const [campaign, setCampaign] =
    useState<NonNullable<LinkListFilters["campaign"]>>("all");
  const [selectedLink, setSelectedLink] = useState<LinkSummary | null>(null);

  const sortOptions = useMemo(
    () =>
      [
        { value: "newest" as const, label: t("appPages.links.sortNewest") },
        { value: "oldest" as const, label: t("appPages.links.sortOldest") },
        { value: "name" as const, label: t("appPages.links.sortName") },
      ],
    [t],
  );

  const statusOptions = useMemo(
    () =>
      [
        { value: "existing" as const, label: t("appPages.links.statusExisting") },
        { value: "deleted" as const, label: t("status.deleted") },
      ],
    [t],
  );

  const campaignOptions = useMemo(
    () =>
      [
        { value: "all" as const, label: t("appPages.links.campaignAll") },
        {
          value: "connected" as const,
          label: t("appPages.links.campaignConnected"),
        },
        { value: "unconnected" as const, label: t("links.noCampaign") },
      ],
    [t],
  );

  const { data: links, loading } = useAsync(
    () =>
      linksService.listMyLinks({
        sort,
        campaign,
        status: status === "existing" ? undefined : "deleted",
      }),
    [sort, status, campaign],
  );

  return (
    <>
      {/* Desktop table — lg+ */}
      <div className="hidden min-w-0 lg:block">
        <MyLinksDesktop
          links={links ?? []}
          loading={loading}
          sort={sort}
          onSortChange={setSort}
          sortOptions={sortOptions}
          status={status}
          onStatusChange={setStatus}
          statusOptions={statusOptions}
          campaign={campaign}
          onCampaignChange={setCampaign}
          campaignOptions={campaignOptions}
          onSelectLink={setSelectedLink}
        />
      </div>

      {/* Mobile / tablet card grid */}
      <div className="mx-auto min-w-0 max-w-5xl lg:hidden">
        <PageHeader title={t("appPages.links.title")} />

        <div className="mb-5 flex w-full min-w-0 flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-3 [&>*]:min-w-0">
          <FilterDropdown
            name="links-sort"
            aria-label={t("appPages.links.sortLabel")}
            value={sort}
            onChange={setSort}
            options={sortOptions}
          />
          <FilterDropdown
            name="links-status"
            aria-label={t("appPages.links.filterStatus")}
            value={status}
            onChange={setStatus}
            options={statusOptions}
          />
          <FilterDropdown
            name="links-campaign"
            aria-label={t("appPages.links.filterCampaign")}
            value={campaign}
            onChange={setCampaign}
            options={campaignOptions}
          />
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <LinkPreviewModal
        link={selectedLink}
        open={Boolean(selectedLink)}
        onClose={() => setSelectedLink(null)}
      />
    </>
  );
}
