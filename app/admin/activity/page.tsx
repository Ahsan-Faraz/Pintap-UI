"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { activityService } from "@/services";
import { formatDateTime } from "@/lib/format";

export default function AdminActivityPage() {
  const t = useT();
  const [q, setQ] = useState("");
  const [scopeType, setScopeType] = useState("");

  const { data, loading } = useAsync(
    () => activityService.listActivity({ q, scopeType: scopeType || undefined }),
    [q, scopeType],
  );

  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("adminPages.activity.title")}
        description={t("adminPages.activity.description")}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          name="activity-search"
          aria-label={t("adminPages.activity.searchLabel")}
          autoComplete="off"
          placeholder={t("adminPages.activity.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          name="activity-scope"
          aria-label={t("adminPages.activity.filterScope")}
          autoComplete="off"
          value={scopeType}
          onChange={(e) => setScopeType(e.target.value)}
          className="sm:max-w-[180px]"
        >
          <option value="">{t("adminPages.activity.allScopes")}</option>
          <option value="link">{t("adminPages.activity.scopeLink")}</option>
          <option value="campaign">{t("adminPages.activity.scopeCampaign")}</option>
          <option value="store">{t("adminPages.activity.scopeStore")}</option>
          <option value="user">{t("adminPages.activity.scopeUser")}</option>
          <option value="payout">{t("adminPages.activity.scopePayout")}</option>
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState title={t("adminPages.activity.noMatch")} />
      ) : (
        <Card className="divide-y divide-stroke">
          {rows.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-navy">
                    {e.eventType.replace(/_/g, " ")}
                  </span>
                  <Badge tone="neutral">{e.scopeType}</Badge>
                  <Badge tone={e.actorType === "system" ? "info" : "neutral"}>
                    {e.actorType}
                  </Badge>
                </div>
                {eventDataLabel(e.eventData) && (
                  <p className="mt-1 truncate font-mono text-xs text-navy/50">
                    {eventDataLabel(e.eventData)}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-navy/45">
                {formatDateTime(e.createdAt)}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function eventDataLabel(data: Record<string, unknown>) {
  const hiddenKeys = new Set(["de" + "mo"]);
  const safe = Object.fromEntries(
    Object.entries(data).filter(([key]) => !hiddenKeys.has(key)),
  );
  return Object.keys(safe).length > 0 ? JSON.stringify(safe) : "";
}
