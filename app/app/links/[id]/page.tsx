"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Button, { buttonClasses } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Input";
import Thumb from "@/components/ui/Thumb";
import Skeleton from "@/components/ui/Skeleton";
import CopyButton from "@/components/ui/CopyButton";
import CopyField from "@/components/ui/CopyField";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import type { Translator } from "@/lib/i18n/translate";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  PencilIcon,
  ShareIcon,
  TagIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { linksService } from "@/services";
import type { CampaignSummary, LinkType } from "@/lib/types";
import {
  formatCurrencyMinor,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format";

function linkTypeLabel(t: Translator, type: string): string {
  if (type === "product") return t("appPages.linkDetail.typeProduct");
  if (type === "shop") return t("appPages.linkDetail.typeShop");
  if (type === "other") return t("appPages.linkDetail.typeOther");
  return type;
}

function statusDotColor(status: string): string {
  if (status === "active") return "bg-green";
  if (status === "inactive") return "bg-navy/30";
  return "bg-red-400";
}

export default function LinkDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { toast } = useToast();
  const t = useT();

  const { data: link, loading, reload } = useAsync(
    () => linksService.getLink(id),
    [id],
  );
  const { data: options, reload: reloadOptions } = useAsync(
    () => linksService.getCampaignOptions(id),
    [id],
  );

  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [switchTo, setSwitchTo] = useState<CampaignSummary | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [showCampaignOptions, setShowCampaignOptions] = useState(false);

  async function run<T>(fn: () => Promise<T>, success: string) {
    setBusy(true);
    try {
      await fn();
      toast({ title: success, variant: "success" });
      reload();
      reloadOptions();
    } catch (e) {
      toast({
        title: translateError(t, e, "appPages.linkDetail.somethingWrong"),
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function shareLink(url: string) {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: link?.name, url });
        return;
      } catch {
        /* User cancelled or share unavailable — fall through to copy. */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t("common.copied"), variant: "success" });
    } catch {
      toast({
        title: t("appPages.linkDetail.somethingWrong"),
        variant: "error",
      });
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 sm:max-w-5xl">
        <Skeleton className="mx-auto h-10 w-48 rounded-[20px]" />
        <Skeleton className="h-52 w-full rounded-[28px]" />
        <Skeleton className="h-32 w-full rounded-[28px]" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="mx-auto max-w-lg sm:max-w-5xl">
        <EmptyState
          title={t("appPages.linkDetail.notFoundTitle")}
          description={t("appPages.linkDetail.notFoundDescription")}
          action={
            <Link href="/app/links" className={buttonClasses({})}>
              {t("common.back")}
            </Link>
          }
        />
      </div>
    );
  }

  const nameValue = name ?? link.name;
  const hasCommission =
    link.metrics.orders > 0 || link.metrics.commissionMinor !== 0;

  const destinationShort = (() => {
    try {
      const u = new URL(link.destinationUrl);
      const path = u.pathname.length > 12 ? `${u.pathname.slice(0, 12)}…` : u.pathname;
      return `${u.hostname}${path}`;
    } catch {
      return link.destinationUrl;
    }
  })();

  const switchOptions =
    options?.filter((c) => c.id !== link.campaign?.id) ?? [];

  return (
    <div className="mx-auto max-w-lg sm:max-w-5xl">
      {/* Mobile-first top bar */}
      <header className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/app/links"
          aria-label={t("appPages.linkDetail.backToLinks")}
          className="app-icon-btn grid h-10 w-10 shrink-0 place-items-center text-navy focus-ring"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-center text-base font-extrabold text-navy">
          {t("appPages.linkDetail.pageTitle")}
        </h1>
        <button
          type="button"
          aria-label={t("linkPreview.share")}
          onClick={() => shareLink(link.shortUrl)}
          className="app-icon-btn grid h-10 w-10 shrink-0 place-items-center text-navy focus-ring"
        >
          <ShareIcon className="h-5 w-5" />
        </button>
      </header>

      {/* Product overview + stats */}
      <div className="app-flat-card mb-4 p-4 sm:p-5">
        <div className="flex gap-3.5">
          <Thumb
            src={link.imageUrl}
            alt={link.name}
            fit="contain"
            className="h-[72px] w-[72px] shrink-0 rounded-[16px] bg-white/90 p-1.5"
          />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-navy [overflow-wrap:anywhere]">
              {link.name}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0c7a45]">
                <span
                  className={cn("h-2 w-2 rounded-full", statusDotColor(link.status))}
                />
                {t(`status.${link.status}`) === `status.${link.status}`
                  ? link.status
                  : t(`status.${link.status}`)}
              </span>
              <Badge tone="neutral" className="text-[10px]">
                {linkTypeLabel(t, link.type)}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-navy/50">
              {link.store?.name ?? link.brand ?? "—"}
              {destinationShort ? ` · ${destinationShort}` : ""}
            </p>
          </div>
        </div>

        <hr className="app-divider-dotted my-4" />

        <div className="grid grid-cols-3 gap-2 text-center">
          <DetailStat label={t("links.clicks")} value={formatNumber(link.metrics.clicks)} />
          <DetailStat label={t("links.orders")} value={formatNumber(link.metrics.orders)} />
          <DetailStat
            label={t("links.earned")}
            value={formatCurrencyMinor(
              link.metrics.commissionMinor,
              link.metrics.currency,
            )}
            accent
          />
        </div>
      </div>

      {/* Your link */}
      <div className="app-flat-card mb-4 p-4 sm:p-5">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-navy/45">
          {t("appPages.linkDetail.yourLink")}
        </p>
        <CopyField
          value={link.shortUrl}
          label={t("appPages.linkDetail.copy")}
          variant="orange"
          iconOnly
        />

        {link.discountCode && (
          <div className="mt-3 flex items-center gap-2 rounded-[16px] border-2 border-dashed border-green/50 bg-green/10 px-3.5 py-2.5">
            <span className="flex-1 font-bold tracking-wide text-navy">
              {link.discountCode}
            </span>
            <CopyButton
              value={link.discountCode}
              variant="icon"
              className="h-8 w-8 shrink-0 border-0 bg-transparent text-[#0c7a45] shadow-none hover:bg-green/15"
            />
          </div>
        )}

        {link.terms && (
          <p className="mt-3 text-xs text-navy/55">{link.terms}</p>
        )}
      </div>

      {/* Campaign */}
      <div className="app-flat-card mb-4 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy/45">
            {t("appPages.linkDetail.campaign")}
          </p>
          {link.campaign && switchOptions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCampaignOptions((v) => !v)}
              className="text-sm font-bold text-orange focus-ring rounded-[8px]"
            >
              {t("appPages.linkDetail.switch")}
            </button>
          )}
        </div>

        {link.campaign ? (
          <>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-green/20 text-[#0c7a45]">
                <TagIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-navy">{link.campaign.name}</p>
                <p className="mt-0.5 text-sm text-navy/60">
                  {t("appPages.linkDetail.campaignMeta", {
                    discount: formatPercent(link.campaign.discountPercent),
                    commission: formatPercent(link.campaign.commissionPercent),
                  })}
                </p>
                {options && (
                  <p className="mt-1.5 text-xs text-navy/45">
                    {t("appPages.linkDetail.codesAvailable", {
                      count:
                        options.find((o) => o.id === link.campaign?.id)
                          ?.codesAvailable ?? 0,
                    })}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRemove(true)}
                disabled={busy}
                className="shrink-0 text-navy/45"
              >
                {t("appPages.linkDetail.remove")}
              </Button>
            </div>

            {showCampaignOptions && switchOptions.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-dotted border-navy/12 pt-4">
                {switchOptions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-input border border-navy/10 bg-background p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-navy">{c.name}</p>
                      <p className="text-xs text-navy/55">
                        {t("appPages.linkDetail.campaignMeta", {
                          discount: formatPercent(c.discountPercent),
                          commission: formatPercent(c.commissionPercent),
                        })}{" "}
                        ·{" "}
                        {t("appPages.linkDetail.codesAvailable", {
                          count: c.codesAvailable,
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy || c.codesAvailable === 0}
                      onClick={() => setSwitchTo(c)}
                    >
                      {t("appPages.linkDetail.switch")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-navy/60">
              {t("appPages.linkDetail.noCampaignConnected")}
            </p>
            {switchOptions.length > 0 && (
              <div className="mt-4 space-y-2">
                {switchOptions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-input border border-navy/10 bg-background p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-navy">{c.name}</p>
                      <p className="text-xs text-navy/55">
                        {t("appPages.linkDetail.campaignMeta", {
                          discount: formatPercent(c.discountPercent),
                          commission: formatPercent(c.commissionPercent),
                        })}{" "}
                        ·{" "}
                        {t("appPages.linkDetail.codesAvailable", {
                          count: c.codesAvailable,
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={busy || c.codesAvailable === 0}
                      onClick={() =>
                        run(
                          () => linksService.connectCampaign(link.id, c.id),
                          t("appPages.linkDetail.campaignConnected"),
                        )
                      }
                    >
                      {t("appPages.linkDetail.connect")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action menu */}
      <div className="app-flat-card mb-4 overflow-hidden">
        <button
          type="button"
          onClick={() => setRenameOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-navy/[0.03] focus-ring"
        >
          <PencilIcon className="h-5 w-5 shrink-0 text-navy/55" />
          <span className="flex-1 font-semibold text-navy">
            {t("appPages.linkDetail.renameLink")}
          </span>
          <ChevronRightIcon
            className={cn(
              "h-5 w-5 text-navy/30 transition",
              renameOpen && "rotate-90",
            )}
          />
        </button>

        {renameOpen && (
          <div className="border-t border-dotted border-navy/12 px-4 py-4">
            <Field label={t("appPages.linkDetail.displayName")} htmlFor="name">
              <Input
                id="name"
                name="link-display-name"
                autoComplete="off"
                value={nameValue}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                disabled={busy || nameValue === link.name}
                onClick={() =>
                  run(
                    () => linksService.updateLink(link.id, { name: nameValue }),
                    t("appPages.linkDetail.nameSaved"),
                  )
                }
              >
                {t("appPages.linkDetail.saveName")}
              </Button>
            </div>
          </div>
        )}

        <hr className="app-divider-dotted mx-4" />

        <button
          type="button"
          disabled={busy || link.status === "deleted" || hasCommission}
          onClick={() => setConfirmDelete(true)}
          className={cn(
            "flex w-full flex-col items-start gap-0.5 px-4 py-3.5 text-left focus-ring",
            hasCommission || link.status === "deleted"
              ? "cursor-not-allowed opacity-45"
              : "hover:bg-navy/[0.03]",
          )}
        >
          <span className="flex w-full items-center gap-3">
            <TrashIcon className="h-5 w-5 shrink-0 text-navy/55" />
            <span className="flex-1 font-semibold text-navy/55">
              {t("appPages.linkDetail.deleteLink")}
            </span>
          </span>
          {hasCommission && (
            <span className="pl-8 text-xs text-navy/45">
              {t("appPages.linkDetail.deleteBlocked")}
            </span>
          )}
        </button>
      </div>

      {/* Settings & extras — functionality preserved */}
      <div className="app-flat-card mb-4 p-4 sm:p-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-navy/45">
          {t("appPages.linkDetail.settings")}
        </p>

        <div className="space-y-4">
          <Field label={t("appPages.linkDetail.type")} htmlFor="type">
            <Select
              id="type"
              name="link-type"
              autoComplete="off"
              value={link.type}
              onChange={(e) =>
                run(
                  () =>
                    linksService.updateLink(link.id, {
                      type: e.target.value as LinkType,
                    }),
                  t("appPages.linkDetail.typeUpdated"),
                )
              }
            >
              <option value="product">{t("appPages.linkDetail.typeProduct")}</option>
              <option value="shop">{t("appPages.linkDetail.typeShop")}</option>
              <option value="other">{t("appPages.linkDetail.typeOther")}</option>
            </Select>
          </Field>

          <div className="flex flex-wrap gap-2">
            <CopyButton value={link.shortUrl} label={t("appPages.linkDetail.copyLink")} />
            <a
              href={`/l/${link.shortCode}`}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              <ExternalLinkIcon className="h-4 w-4" />
              {t("appPages.linkDetail.preview")}
            </a>
          </div>

          {link.status === "active" ? (
            <Button
              variant="secondary"
              fullWidth
              disabled={busy}
              onClick={() =>
                run(
                  () => linksService.setStatus(link.id, "inactive"),
                  t("appPages.linkDetail.deactivated"),
                )
              }
            >
              {t("appPages.linkDetail.deactivate")}
            </Button>
          ) : link.status === "inactive" ? (
            <Button
              fullWidth
              disabled={busy}
              onClick={() =>
                run(
                  () => linksService.setStatus(link.id, "active"),
                  t("appPages.linkDetail.activated"),
                )
              }
            >
              {t("appPages.linkDetail.activate")}
            </Button>
          ) : null}

          <div className="border-t border-dotted border-navy/12 pt-3 text-xs text-navy/45">
            <p>{t("appPages.linkDetail.created", { date: formatDate(link.createdAt) })}</p>
            <p>{t("appPages.linkDetail.updated", { date: formatDate(link.updatedAt) })}</p>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy/45">
              {t("appPages.linkDetail.destination")}
            </p>
            <a
              href={link.destinationUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-orange hover:underline focus-ring rounded-[8px]"
            >
              {link.destinationUrl}
            </a>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy/45">
              {t("appPages.linkDetail.resolverUrl")}
            </p>
            <CopyField value={link.resolverUrl} label={t("appPages.linkDetail.copy")} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await run(() => linksService.deleteLink(link.id), t("appPages.linkDetail.deleted"));
          router.push("/app/links");
        }}
        title={t("appPages.linkDetail.deleteTitle")}
        description={t("appPages.linkDetail.deleteDescription")}
        confirmLabel={t("appPages.linkDetail.delete")}
        danger
        loading={busy}
      />

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          run(() => linksService.removeCampaign(link.id), t("appPages.linkDetail.campaignRemoved"));
        }}
        title={t("appPages.linkDetail.removeCampaignTitle")}
        description={t("appPages.linkDetail.removeCampaignDescription")}
        confirmLabel={t("appPages.linkDetail.remove")}
        loading={busy}
      />

      <ConfirmDialog
        open={Boolean(switchTo)}
        onClose={() => setSwitchTo(null)}
        onConfirm={() => {
          const target = switchTo;
          setSwitchTo(null);
          if (target)
            run(
              () => linksService.connectCampaign(link.id, target.id),
              t("appPages.linkDetail.campaignSwitched"),
            );
        }}
        title={t("appPages.linkDetail.switchCampaignTitle")}
        description={t("appPages.linkDetail.switchDescription", {
          name: switchTo?.name ?? "",
        })}
        confirmLabel={t("appPages.linkDetail.switch")}
        loading={busy}
      />
    </div>
  );
}

function DetailStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={`text-lg font-extrabold tracking-tight ${
          accent ? "text-[#0c7a45]" : "text-navy"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-navy/45">{label}</p>
    </div>
  );
}
