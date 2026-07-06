"use client";

import PageHeader from "@/components/ui/PageHeader";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { authService } from "@/services";
import type { Profile } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function AdminUsersPage() {
  const t = useT();
  const { data, loading } = useAsync(() => authService.listUsers(), []);

  const columns: Column<Profile>[] = [
    {
      key: "user",
      header: t("orders.user"),
      sortAccessor: (u) => u.firstName,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar src={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} size={32} />
          <div>
            <p className="font-semibold text-navy">
              {u.firstName} {u.lastName}
            </p>
            <p className="text-xs text-navy/50">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "roles",
      header: t("orders.roles"),
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => (
            <Badge key={r} tone={r === "admin" ? "orange" : "neutral"}>
              {t(`roles.${r}`)}
            </Badge>
          ))}
          {/* Soft-deleted accounts stay listed for payment history. */}
          {u.deletedAt && (
            <Badge tone="danger">{t("adminPages.users.deleted")}</Badge>
          )}
        </div>
      ),
    },
    { key: "country", header: t("orders.country"), render: (u) => u.country ?? "—" },
    {
      key: "joined",
      header: t("orders.joined"),
      align: "right",
      sortAccessor: (u) => u.createdAt,
      render: (u) => formatDate(u.createdAt),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t("adminPages.users.title")}
        description={t("adminPages.users.description")}
      />
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DataTable
          columns={columns}
          rows={data ?? []}
          getRowKey={(u) => u.id}
          searchAccessor={(u) => `${u.firstName} ${u.lastName} ${u.email}`}
          searchPlaceholder={t("adminPages.users.search")}
        />
      )}
    </div>
  );
}
