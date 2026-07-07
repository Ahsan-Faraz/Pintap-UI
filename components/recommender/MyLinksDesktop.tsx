"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import Thumb from "@/components/ui/Thumb";
import FilterDropdown, {
  type FilterDropdownOption,
} from "@/components/ui/FilterDropdown";
import { buttonClasses } from "@/components/ui/Button";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { authService } from "@/services";
import type {
  LinkListFilters,
  LinkSummary,
  LinkType,
  SortOrder,
} from "@/lib/types";
import { formatCurrencyMinor, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = "existing" | "deleted";
type SortKey = "commission" | "clicks" | "orders" | "updated" | "name";

const PAGE_SIZE = 5;

const MUTED = "#94A3B8";
const ROW_LINE = "#EEF1F4";
const SEARCH_BG = "#EDF0F4";

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue/15 text-[#076985]",
  "bg-orange/15 text-orange",
  "bg-green/15 text-[#086838]",
  "bg-purple/15 text-purple",
] as const;

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[h]!;
}

function LinkStatusDot({
  active,
  t,
}: {
  active: boolean;
  t: ReturnType<typeof useT>;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          active ? "bg-[#22C55E]" : "bg-navy/25",
        )}
      />
      <span className={active ? "text-[#086838]" : "text-navy/45"}>
        {active
          ? t("appPages.links.statusActive")
          : t("appPages.links.statusInactive")}
      </span>
    </span>
  );
}

function PaginationBtn({
  label,
  onClick,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-semibold transition focus-ring disabled:opacity-35",
        active
          ? "bg-navy text-white"
          : "border border-[#E4E7EC] bg-white text-navy hover:opacity-80",
      )}
    >
      {label}
    </button>
  );
}

export default function MyLinksDesktop({
  links,
  loading,
  sort,
  onSortChange,
  sortOptions,
  status,
  onStatusChange,
  statusOptions,
  campaign,
  onCampaignChange,
  campaignOptions,
  onSelectLink,
}: {
  links: LinkSummary[];
  loading: boolean;
  sort: SortOrder;
  onSortChange: (value: SortOrder) => void;
  sortOptions: FilterDropdownOption<SortOrder>[];
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  statusOptions: FilterDropdownOption<StatusFilter>[];
  campaign: NonNullable<LinkListFilters["campaign"]>;
  onCampaignChange: (value: NonNullable<LinkListFilters["campaign"]>) => void;
  campaignOptions: FilterDropdownOption<
    NonNullable<LinkListFilters["campaign"]>
  >[];
  onSelectLink: (link: LinkSummary) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: user } = useAsync(() => authService.getCurrentUser(), []);
  const creatorName = user ? `${user.firstName} ${user.lastName}` : "—";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return links;
    return links.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.shortCode.toLowerCase().includes(q) ||
        (l.store?.name ?? "").toLowerCase().includes(q) ||
        creatorName.toLowerCase().includes(q),
    );
  }, [links, query, creatorName]);

  const displayed = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "commission") {
        cmp = a.metrics.commissionMinor - b.metrics.commissionMinor;
      } else if (sortKey === "clicks") {
        cmp = a.metrics.clicks - b.metrics.clicks;
      } else if (sortKey === "orders") {
        cmp = a.metrics.orders - b.metrics.orders;
      } else if (sortKey === "updated") {
        cmp = +new Date(a.updatedAt) - +new Date(b.updatedAt);
      } else {
        cmp = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalCount = links.length;
  const activeCount = links.filter((l) => l.status === "active").length;
  const pageCount = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = displayed.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const rangeStart = displayed.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const rangeEnd = Math.min(displayed.length, (safePage + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function exportCsv() {
    const header = [
      "Link",
      "Short code",
      "Store",
      "Status",
      "Clicks",
      "Orders",
      "Commission",
      "Updated",
    ];
    const lines = displayed.map((l) =>
      [
        l.name,
        l.shortCode,
        l.store?.name ?? "",
        l.status,
        l.metrics.clicks,
        l.metrics.orders,
        (l.metrics.commissionMinor / 100).toFixed(2),
        l.updatedAt,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-links.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function typeLabel(type: LinkType): string {
    if (type === "product") return t("appPages.linkDetail.typeProduct");
    if (type === "shop") return t("appPages.linkDetail.typeShop");
    return t("appPages.linkDetail.typeOther");
  }

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-navy">
              {t("nav.links")}
            </h1>
            {!loading && (
              <p className="text-sm text-navy/45">
                {t("appPages.links.desktop.headerSummary", {
                  total: formatNumber(totalCount),
                  active: formatNumber(activeCount),
                })}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={displayed.length === 0}
          className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-input border border-navy/15 bg-white px-4 text-sm font-semibold text-navy transition hover:border-navy/30 focus-ring disabled:opacity-40"
        >
          <UploadIcon className="h-4 w-4" />
          {t("appPages.links.desktop.exportCsv")}
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-[520px] w-full rounded-card" />
      ) : (
        <div className="app-flat-card min-w-0 overflow-hidden">
          {/* Search + filters */}
          <div className="border-b border-navy/5 px-4 py-3.5">
            <div className="relative mb-3">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="search"
                name="links-search-desktop"
                aria-label={t("appPages.links.searchLabel")}
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                  setSortKey(null);
                }}
                placeholder={t("appPages.links.desktop.searchPlaceholder")}
                className="h-10 w-full rounded-input border border-navy/15 pl-10 pr-4 text-sm text-navy outline-none transition placeholder:text-[#94A3B8] focus:border-orange focus:ring-2 focus:ring-orange/20"
                style={{ backgroundColor: SEARCH_BG }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-3">
              <FilterDropdown
                name="links-sort-desktop"
                aria-label={t("appPages.links.sortLabel")}
                value={sort}
                onChange={(v) => {
                  onSortChange(v);
                  setPage(0);
                  setSortKey(null);
                }}
                options={sortOptions}
              />
              <FilterDropdown
                name="links-status-desktop"
                aria-label={t("appPages.links.filterStatus")}
                value={status}
                onChange={(v) => {
                  onStatusChange(v);
                  setPage(0);
                  setSortKey(null);
                }}
                options={statusOptions}
              />
              <FilterDropdown
                name="links-campaign-desktop"
                aria-label={t("appPages.links.filterCampaign")}
                value={campaign}
                onChange={(v) => {
                  onCampaignChange(v);
                  setPage(0);
                  setSortKey(null);
                }}
                options={campaignOptions}
              />
            </div>
            <p
              className="shrink-0 text-sm tabular-nums"
              style={{ color: MUTED }}
            >
              {t("appPages.links.desktop.rangeOfTotal", {
                start: formatNumber(rangeStart),
                end: formatNumber(rangeEnd),
                total: formatNumber(displayed.length),
              })}
            </p>
            </div>
          </div>

          {displayed.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title={t("appPages.links.noMatchTitle")}
                description={t("appPages.links.noMatchDescription")}
                action={
                  <Link href="/app/create-link" className={buttonClasses({})}>
                    {t("dashboard.user.createLink")}
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              <div className="min-w-0 overflow-hidden">
                <table className="w-full table-fixed text-left">
                  <thead>
                    <tr
                      className="text-[11px] font-bold uppercase tracking-[0.06em]"
                      style={{
                        color: MUTED,
                        borderBottom: `1px solid ${ROW_LINE}`,
                      }}
                    >
                      <th className="w-[32%] px-4 py-3 font-bold">
                        {t("appPages.links.desktop.colLink")}
                      </th>
                      <th className="w-[11%] px-2 py-3 font-bold">
                        {t("orders.store")}
                      </th>
                      <th className="w-[16%] px-2 py-3 font-bold">
                        {t("orders.createdBy")}
                      </th>
                      <th className="w-[10%] px-2 py-3 font-bold">
                        {t("orders.status")}
                      </th>
                      <th className="w-[7%] px-2 py-3 font-bold">
                        <button
                          type="button"
                          onClick={() => toggleSort("clicks")}
                          className="inline-flex items-center gap-0.5 hover:text-navy"
                        >
                          {t("links.clicks")}
                          {sortKey === "clicks" &&
                            (sortDir === "asc" ? (
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            ))}
                        </button>
                      </th>
                      <th className="w-[7%] px-2 py-3 font-bold">
                        <button
                          type="button"
                          onClick={() => toggleSort("orders")}
                          className="inline-flex items-center gap-0.5 hover:text-navy"
                        >
                          {t("links.orders")}
                          {sortKey === "orders" &&
                            (sortDir === "asc" ? (
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            ))}
                        </button>
                      </th>
                      <th className="w-[10%] px-2 py-3 font-bold">
                        <button
                          type="button"
                          onClick={() => toggleSort("commission")}
                          className="inline-flex items-center gap-0.5 hover:text-navy"
                        >
                          {t("dashboard.user.commission")}
                          {sortKey === "commission" &&
                            (sortDir === "asc" ? (
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            ))}
                        </button>
                      </th>
                      <th className="w-[7%] px-3 py-3 font-bold">
                        <button
                          type="button"
                          onClick={() => toggleSort("updated")}
                          className="inline-flex items-center gap-0.5 hover:text-navy"
                        >
                          {t("orders.updated")}
                          {sortKey === "updated" &&
                            (sortDir === "asc" ? (
                              <ChevronUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5" />
                            ))}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((link) => (
                      <tr
                        key={link.id}
                        className="cursor-pointer transition hover:bg-navy/[0.02]"
                        style={{ borderBottom: `1px solid ${ROW_LINE}` }}
                        onClick={() => onSelectLink(link)}
                      >
                        <td className="max-w-0 px-4 py-3.5 align-middle">
                          <div className="flex min-w-0 items-center gap-3">
                            <Thumb
                              src={link.imageUrl}
                              alt={link.name}
                              width={44}
                              height={44}
                              className="h-11 w-11 shrink-0 rounded-lg"
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate font-bold text-navy"
                                title={link.name}
                              >
                                {link.name}
                              </p>
                              <p
                                className="truncate text-xs text-navy/45"
                                title={`/l/${link.shortCode} · ${typeLabel(link.type)}`}
                              >
                                /l/{link.shortCode} · {typeLabel(link.type)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td
                          className="max-w-0 truncate px-2 py-3.5 align-middle text-[15px] text-navy/70"
                          title={link.store?.name ?? undefined}
                        >
                          {link.store?.name ?? "—"}
                        </td>
                        <td className="max-w-0 px-2 py-3.5 align-middle">
                          {user ? (
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={cn(
                                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                                  avatarColor(creatorName),
                                )}
                              >
                                {initials(user.firstName, user.lastName)}
                              </span>
                              <span
                                className="min-w-0 truncate text-[15px] text-navy/70"
                                title={creatorName}
                              >
                                {creatorName}
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-2 py-3.5 align-middle">
                          <LinkStatusDot
                            active={link.status === "active"}
                            t={t}
                          />
                        </td>
                        <td className="px-2 py-3.5 align-middle tabular-nums text-navy">
                          {formatNumber(link.metrics.clicks)}
                        </td>
                        <td className="px-2 py-3.5 align-middle tabular-nums text-navy">
                          {formatNumber(link.metrics.orders)}
                        </td>
                        <td className="truncate px-2 py-3.5 align-middle text-sm font-bold text-[#086838]">
                          {formatCurrencyMinor(
                            link.metrics.commissionMinor,
                            link.metrics.currency,
                          )}
                        </td>
                        <td className="px-3 py-3.5 align-middle text-sm text-navy/55">
                          {formatShortDate(link.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                style={{ borderTop: `1px solid ${ROW_LINE}` }}
              >
                <p className="text-sm text-navy/45">
                  {t("appPages.links.desktop.showing", {
                    shown: formatNumber(paged.length),
                    total: formatNumber(displayed.length),
                  })}
                </p>
                <div className="flex items-center gap-1">
                  <PaginationBtn
                    label="‹"
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  />
                  {Array.from({ length: pageCount }, (_, i) => i)
                    .slice(
                      Math.max(0, safePage - 2),
                      Math.min(pageCount, safePage + 3),
                    )
                    .map((i) => (
                      <PaginationBtn
                        key={i}
                        label={String(i + 1)}
                        active={i === safePage}
                        onClick={() => setPage(i)}
                      />
                    ))}
                  <PaginationBtn
                    label="›"
                    disabled={safePage >= pageCount - 1}
                    onClick={() =>
                      setPage((p) => Math.min(pageCount - 1, p + 1))
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
