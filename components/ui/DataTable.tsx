"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/context/I18nProvider";
import { Input } from "./Input";
import EmptyState from "./EmptyState";
import { ChevronDownIcon, ChevronUpIcon } from "./icons";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  /** Provide to make the column sortable. */
  sortAccessor?: (row: T) => string | number;
  align?: "left" | "right";
  className?: string;
  headerClassName?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  getRowKey,
  searchAccessor,
  searchPlaceholder,
  toolbar,
  headerFilter,
  pageSize = 10,
  onRowClick,
  emptyTitle,
  emptyDescription,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  searchAccessor?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  /** Filter control (e.g. a year Select) shown on the right of the toolbar. */
  headerFilter?: React.ReactNode;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let out = rows;
    if (query && searchAccessor) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchAccessor(r).toLowerCase().includes(q));
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortAccessor) {
        const acc = col.sortAccessor;
        out = [...out].sort((a, b) => {
          const av = acc(a);
          const bv = acc(b);
          const cmp =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, searchAccessor, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  function toggleSort(col: Column<T>) {
    if (!col.sortAccessor) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-4">
      {(searchAccessor || toolbar || headerFilter) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {searchAccessor ? (
            <Input
              name="table-search"
              aria-label={t("common.searchTable")}
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder ?? t("common.search")}
              className="sm:max-w-xs"
            />
          ) : (
            <span />
          )}
          {(toolbar || headerFilter) && (
            <div className="flex items-center gap-2">
              {toolbar}
              {headerFilter}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? t("common.nothingHere")}
          description={emptyDescription}
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-navy/10 bg-surface shadow-card">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-navy/10 bg-navy/[0.03]">
                {columns.map((col) => {
                  const sortable = Boolean(col.sortAccessor);
                  const sorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-xs font-bold uppercase tracking-wide text-navy/55",
                        col.align === "right" ? "text-right" : "text-left",
                        col.headerClassName,
                      )}
                      aria-sort={
                        sorted
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-input text-left transition-colors hover:text-navy focus-ring",
                            col.align === "right" && "flex-row-reverse",
                          )}
                        >
                          {col.header}
                          {sorted ? (
                            sortDir === "asc" ? (
                              <ChevronUpIcon className="h-3.5 w-3.5 text-navy" />
                            ) : (
                              <ChevronDownIcon className="h-3.5 w-3.5 text-navy" />
                            )
                          ) : (
                            <ChevronDownIcon className="h-3.5 w-3.5 text-navy/25" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  className={cn(
                    "border-b border-navy/10 transition-colors last:border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-orange",
                    onRowClick && "cursor-pointer hover:bg-navy/[0.03]",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 align-middle text-navy",
                        col.align === "right" ? "text-right" : "text-left",
                        col.className,
                      )}
                    >
                      {col.render ? col.render(row) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-navy/60">
          <span>
            {t("common.pageRange", {
              from: safePage * pageSize + 1,
              to: Math.min(filtered.length, (safePage + 1) * pageSize),
              total: filtered.length,
            })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-lg border border-navy/12 bg-surface px-3 py-1.5 font-semibold text-navy transition-colors hover:border-navy/30 focus-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("common.prev")}
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded-lg border border-navy/12 bg-surface px-3 py-1.5 font-semibold text-navy transition-colors hover:border-navy/30 focus-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
