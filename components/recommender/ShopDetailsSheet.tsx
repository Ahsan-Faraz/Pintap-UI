"use client";

import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Thumb from "@/components/ui/Thumb";
import Skeleton from "@/components/ui/Skeleton";
import Button, { buttonClasses } from "@/components/ui/Button";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { campaignsService } from "@/services";
import type { CampaignSummary, StoreSummary } from "@/lib/types";
import { formatDate, formatPercent } from "@/lib/format";

/**
 * Shop detail bottom sheet, opened from a shop card (homepage rail + Shops
 * page). Client feedback 2026-07: no "Shop Details" meta rows — just the shop
 * logo + name, the active campaign(s) with discount & commission as a table,
 * and the "Visit shop" / "Create link" actions.
 */
export default function ShopDetailsSheet({
  store,
  open,
  onClose,
}: {
  store: StoreSummary | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();

  const { data: campaigns, loading } = useAsync(
    async () =>
      store && open ? campaignsService.listCampaignsForStore(store.id) : [],
    [store?.id, open],
  );

  if (!store) return null;

  const websiteHost = store.primaryDomain?.replace(/^https?:\/\//, "") ?? null;
  const websiteUrl = websiteHost ? `https://${websiteHost}` : null;
  const active = (campaigns ?? []).filter((c) => c.status === "active");

  function createLink() {
    onClose();
    router.push(
      websiteUrl
        ? `/app/create-link?url=${encodeURIComponent(websiteUrl)}`
        : "/app/create-link",
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex min-w-0 items-center gap-3">
          <Thumb
            src={store.logoUrl}
            alt={store.name}
            className="h-11 w-11 shrink-0 rounded-input"
          />
          <span className="truncate">{store.name}</span>
        </span>
      }
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : active.length === 0 ? (
        <p className="py-2 text-sm text-navy/60">
          {t("appPages.discover.noActiveCampaigns")}
        </p>
      ) : (
        <div className="space-y-4">
          {active.map((c) => (
            <CampaignTable key={c.id} campaign={c} />
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <a
          href={websiteUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!websiteUrl}
          className={buttonClasses({
            className: !websiteUrl ? "pointer-events-none opacity-50" : undefined,
          })}
        >
          {t("shopDetails.visit")}
        </a>
        <Button variant="navy" onClick={createLink}>
          {t("shopDetails.createLink")}
        </Button>
      </div>
    </Modal>
  );
}

/** One active campaign, rendered as a compact label/value table. */
function CampaignTable({ campaign }: { campaign: CampaignSummary }) {
  const t = useT();
  const rows: { label: string; value: string }[] = [
    { label: t("shopDetails.campaign"), value: campaign.name },
    {
      label: t("shopDetails.discount"),
      value: formatPercent(campaign.discountPercent),
    },
    {
      label: t("shopDetails.commission"),
      value: formatPercent(campaign.commissionPercent),
    },
    {
      label: t("shopDetails.activeUntil"),
      value: campaign.endAt
        ? formatDate(campaign.endAt)
        : t("stores.furtherNotice"),
    },
  ];

  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-stroke">
        {rows.map((r) => (
          <tr key={r.label}>
            <th
              scope="row"
              className="w-1/2 py-2.5 pr-3 text-left font-normal text-navy/60"
            >
              {r.label}
            </th>
            <td className="py-2.5 text-right font-semibold text-navy">
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
