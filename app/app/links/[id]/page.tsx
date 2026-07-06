"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Card";
import Button, { buttonClasses } from "@/components/ui/Button";
import Badge, { StatusBadge } from "@/components/ui/Badge";
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
  ActivityIcon,
  ExternalLinkIcon,
  InfoIcon,
  SettingsIcon,
  TagIcon,
} from "@/components/ui/icons";
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

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="mx-auto max-w-4xl">
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
  // Links with a commission in any status must not be deletable (client req).
  const hasCommission =
    link.metrics.orders > 0 || link.metrics.commissionMinor !== 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={link.name}
        breadcrumbs={
          <Link href="/app/links" className="rounded-input hover:text-navy focus-ring">
            ← {t("appPages.linkDetail.backToLinks")}
          </Link>
        }
        actions={
          <>
            <CopyButton value={link.shortUrl} label={t("appPages.linkDetail.copyLink")} />
            <a
              href={`/l/${link.shortCode}`}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: "secondary" })}
            >
              <ExternalLinkIcon className="h-4 w-4" />
              {t("appPages.linkDetail.preview")}
            </a>
          </>
        }
      />

      {/* min-w-0 on the grid columns: grid items default to min-width:auto, so a
          long unbroken URL would blow the column out past the mobile viewport. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Section title={t("appPages.linkDetail.overview")} icon={<InfoIcon />}>
            <div className="flex gap-4">
              <Thumb
                src={link.imageUrl}
                alt={link.name}
                fit="contain"
                className="h-24 w-24 shrink-0 rounded-input bg-white p-1"
              />
              <div className="min-w-0 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <StatusBadge status={link.status} />
                  <Badge tone="neutral">{linkTypeLabel(t, link.type)}</Badge>
                </div>
                <p className="text-navy/60">
                  {t("appPages.linkDetail.store")}:{" "}
                  <span className="font-semibold text-navy">
                    {link.store?.name ?? "—"}
                  </span>
                </p>
                {link.brand && (
                  <p className="text-navy/60">
                    {t("appPages.linkDetail.brand")}:{" "}
                    <span className="text-navy">{link.brand}</span>
                  </p>
                )}
                <p className="truncate text-navy/60">
                  {t("appPages.linkDetail.destination")}:{" "}
                  <a
                    href={link.destinationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-input text-orange hover:underline focus-ring"
                  >
                    {link.destinationUrl}
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold text-navy/55">
                  {t("appPages.linkDetail.resolverUrl")}
                </p>
                <CopyField value={link.resolverUrl} label={t("appPages.linkDetail.copy")} />
              </div>

              {link.discountCode && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-navy/55">
                    {t("appPages.linkDetail.discountCode")}
                  </p>
                  <div className="flex items-center gap-2 rounded-input border border-stroke bg-green/10 px-3 py-2">
                    <span className="flex-1 font-bold tracking-wide text-navy">
                      {link.discountCode}
                    </span>
                    <CopyButton value={link.discountCode} variant="icon" />
                  </div>
                </div>
              )}

              {link.terms && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-navy/55">
                    {t("appPages.linkDetail.campaignTerms")}
                  </p>
                  <p className="text-sm text-navy/65">{link.terms}</p>
                </div>
              )}
            </div>
          </Section>

          <Section title={t("appPages.linkDetail.campaign")} icon={<TagIcon />}>
            {link.campaign ? (
              <div className="flex items-center justify-between gap-3 rounded-card border border-stroke p-3">
                <div>
                  <p className="font-semibold text-navy">{link.campaign.name}</p>
                  <p className="text-xs text-navy/55">
                    {t("appPages.linkDetail.campaignMeta", {
                      discount: formatPercent(link.campaign.discountPercent),
                      commission: formatPercent(link.campaign.commissionPercent),
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRemove(true)}
                  disabled={busy}
                >
                  {t("appPages.linkDetail.remove")}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-navy/60">
                {t("appPages.linkDetail.noCampaignConnected")}
              </p>
            )}

            {options && options.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-navy/55">
                  {link.campaign
                    ? t("appPages.linkDetail.switchCampaign")
                    : t("appPages.linkDetail.availableCampaigns")}
                </p>
                <div className="space-y-2">
                  {options
                    .filter((c) => c.id !== link.campaign?.id)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 rounded-card border border-stroke p-3"
                      >
                        <div>
                          <p className="font-semibold text-navy">{c.name}</p>
                          <p className="text-xs text-navy/55">
                            {t("appPages.linkDetail.campaignMeta", {
                              discount: formatPercent(c.discountPercent),
                              commission: formatPercent(c.commissionPercent),
                            })}{" "}
                            · {t("appPages.linkDetail.codesAvailable", {
                              count: c.codesAvailable,
                            })}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy || c.codesAvailable === 0}
                          onClick={() =>
                            link.campaign
                              ? setSwitchTo(c)
                              : run(
                                  () =>
                                    linksService.connectCampaign(link.id, c.id),
                                  t("appPages.linkDetail.campaignConnected"),
                                )
                          }
                        >
                          {link.campaign
                            ? t("appPages.linkDetail.switch")
                            : t("appPages.linkDetail.connect")}
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        <div className="min-w-0 space-y-4">
          <Section title={t("appPages.linkDetail.performance")} icon={<ActivityIcon />}>
            <div className="space-y-3">
              <Stat label={t("links.clicks")} value={formatNumber(link.metrics.clicks)} />
              <Stat label={t("links.orders")} value={formatNumber(link.metrics.orders)} />
              <Stat
                label={t("dashboard.user.commission")}
                value={formatCurrencyMinor(
                  link.metrics.commissionMinor,
                  link.metrics.currency,
                )}
                accent
              />
            </div>
            <div className="mt-4 border-t border-stroke pt-3 text-xs text-navy/50">
              <p>{t("appPages.linkDetail.created", { date: formatDate(link.createdAt) })}</p>
              <p>{t("appPages.linkDetail.updated", { date: formatDate(link.updatedAt) })}</p>
            </div>
          </Section>

          <Section title={t("appPages.linkDetail.settings")} icon={<SettingsIcon />}>
            <div className="space-y-4">
              <Field label={t("appPages.linkDetail.displayName")} htmlFor="name">
                <Input
                  id="name"
                  name="link-display-name"
                  autoComplete="off"
                  value={nameValue}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
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

              <div className="border-t border-stroke pt-4">
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
                <Button
                  variant="danger"
                  fullWidth
                  className="mt-2"
                  disabled={busy || link.status === "deleted" || hasCommission}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t("appPages.linkDetail.deleteLink")}
                </Button>
                {hasCommission && (
                  <p className="mt-2 text-xs text-navy/55">
                    {t("appPages.linkDetail.deleteBlocked")}
                  </p>
                )}
              </div>
            </div>
          </Section>
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-navy/60">{label}</span>
      <span
        className={`text-lg font-extrabold ${accent ? "text-[#0c7a45]" : "text-navy"}`}
      >
        {value}
      </span>
    </div>
  );
}
