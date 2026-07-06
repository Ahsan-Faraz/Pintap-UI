"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card, { Section } from "@/components/ui/Card";
import Button, { buttonClasses } from "@/components/ui/Button";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import { Field, Input, Textarea } from "@/components/ui/Input";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import { AlertIcon } from "@/components/ui/icons";
import { useAsync } from "@/lib/hooks";
import { campaignsService, storesService } from "@/services";
import type { DiscountCodeSourceInput } from "@/lib/types";
import { formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  const { data, loading, reload } = useAsync(async () => {
    const campaign = await campaignsService.getCampaign(id);
    if (!campaign) return null;
    const [codes, store] = await Promise.all([
      campaignsService.listCodes(id),
      storesService.getStore(campaign.storeId),
    ]);
    return { campaign, codes, store };
  }, [id]);

  async function run<T>(fn: () => Promise<T>, msg: string) {
    setBusy(true);
    try {
      await fn();
      toast({ title: msg, variant: "success" });
      reload();
    } catch (e) {
      toast({
        title: translateError(t, e, "appPages.linkDetail.somethingWrong"),
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!data?.campaign) {
    return (
      <EmptyState
        title={t("merchantPages.campaigns.notFound")}
        action={
          <Link href="/merchant/campaigns" className={buttonClasses({})}>
            {t("common.back")}
          </Link>
        }
      />
    );
  }

  const { campaign, codes, store } = data;
  const disconnected = !store?.connected;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={campaign.name}
        breadcrumbs={
          <Link href="/merchant/campaigns" className="rounded-input hover:text-navy focus-ring">
            ← {t("merchantPages.campaigns.back")}
          </Link>
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditOpen(true)}
              disabled={busy}
            >
              {t("merchantPages.campaigns.edit")}
            </Button>
            <Button onClick={() => setCodesOpen(true)} disabled={busy}>
              {t("merchantPages.campaigns.addCodes")}
            </Button>
          </>
        }
      />

      {disconnected && (
        <Card className="mb-4 flex items-start gap-3 border-red-200 bg-red-50 p-4">
          <span className="mt-0.5 text-red-600">
            <AlertIcon />
          </span>
          <p className="text-sm text-navy/70">
            {t("merchantPages.campaigns.disconnected")}
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title={t("merchantPages.campaigns.overview")}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={campaign.status} />
              <Badge tone="neutral">{campaign.store?.name}</Badge>
              <StatusBadge status={campaign.fundingState} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <HeroStat
                label={t("merchantPages.campaignForm.discount")}
                value={formatPercent(campaign.discountPercent)}
                accent="orange"
              />
              <HeroStat
                label={t("merchantPages.campaignForm.commission")}
                value={formatPercent(campaign.commissionPercent)}
              />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Detail label={t("merchantPages.campaignForm.startDate")} value={formatDate(campaign.startAt)} />
              <Detail
                label={t("merchantPages.campaignForm.endDate")}
                value={campaign.endAt ? formatDate(campaign.endAt) : "—"}
              />
            </dl>
            <div className="mt-4">
              <p className="text-xs font-semibold text-navy/55">
                {t("merchantPages.campaignForm.terms")}
              </p>
              <p className="mt-1 text-sm text-navy/70">{campaign.terms}</p>
            </div>
          </Section>

          <Section title={t("merchantPages.campaigns.discountCodes")}>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <CodeStat
                label={t("merchantPages.campaigns.available")}
                value={campaign.codesAvailable}
                accent="available"
              />
              <CodeStat
                label={t("merchantPages.campaigns.claimed")}
                value={campaign.codesClaimed}
                accent="claimed"
              />
              <CodeStat
                label={t("merchantPages.campaigns.total")}
                value={campaign.codesTotal}
                accent="total"
              />
            </div>
            {codes.length === 0 ? (
              <EmptyState title={t("merchantPages.campaigns.noCodes")} />
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-card border border-stroke">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-beige/70 text-xs uppercase tracking-wide text-navy/50 backdrop-blur">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">{t("orders.code")}</th>
                      <th className="px-4 py-2.5 text-left font-semibold">{t("orders.status")}</th>
                      <th className="px-4 py-2.5 text-left font-semibold">{t("merchantPages.campaigns.claimedBy")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((c) => (
                      <tr
                        key={c.id}
                        className="border-t border-stroke/70 transition-colors hover:bg-navy/[0.015]"
                      >
                        <td className="px-4 py-2.5 font-mono font-semibold text-navy">{c.code}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          <ClaimedBy name={c.claimedByName} linkName={c.claimedLinkName} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        <Section title={t("merchantPages.campaigns.manage")}>
          <div className="space-y-2">
            {campaign.status === "active" ? (
              <Button
                variant="secondary"
                fullWidth
                disabled={busy}
                onClick={() =>
                  run(() => campaignsService.pauseCampaign(campaign.id), t("merchantPages.campaigns.paused"))
                }
              >
                Pause campaign
              </Button>
            ) : campaign.status === "ended" ? null : (
              <Button
                fullWidth
                disabled={busy || disconnected}
                onClick={() =>
                  run(
                    () => campaignsService.resumeCampaign(campaign.id),
                    t("merchantPages.campaigns.activated"),
                  )
                }
              >
                {campaign.status === "paused"
                  ? t("merchantPages.campaigns.resume")
                  : t("merchantPages.campaigns.activate")}
              </Button>
            )}
            {campaign.status !== "ended" && (
              <Button
                variant="danger"
                fullWidth
                disabled={busy}
                onClick={() => setConfirmStop(true)}
              >
                {t("merchantPages.campaigns.stop")}
              </Button>
            )}
          </div>
        </Section>
      </div>

      <EditCampaignModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        busy={busy}
        initial={{
          name: campaign.name,
          terms: campaign.terms,
          discount: String(campaign.discountPercent ?? 0),
          commission: String(campaign.commissionPercent ?? 0),
          startAt: campaign.startAt.slice(0, 10),
          endAt: campaign.endAt ? campaign.endAt.slice(0, 10) : "",
        }}
        onSave={(values) =>
          run(async () => {
            await campaignsService.updateCampaign(campaign.id, {
              name: values.name,
              terms: values.terms,
              discountPercent: parseFloat(values.discount || "0"),
              commissionPercent: parseFloat(values.commission || "0"),
              startAt: new Date(values.startAt).toISOString(),
              endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
            });
            setEditOpen(false);
          }, t("merchantPages.campaigns.updated"))
        }
      />

      <AddCodesModal
        open={codesOpen}
        onClose={() => setCodesOpen(false)}
        busy={busy}
        onAdd={(source) =>
          run(async () => {
            await campaignsService.addCodes(campaign.id, source);
            setCodesOpen(false);
          }, t("merchantPages.campaigns.codesAdded"))
        }
      />

      <ConfirmDialog
        open={confirmStop}
        onClose={() => setConfirmStop(false)}
        onConfirm={() => {
          setConfirmStop(false);
          run(() => campaignsService.stopCampaign(campaign.id), t("merchantPages.campaigns.stopped"));
        }}
        title={t("merchantPages.campaigns.stopTitle")}
        description={t("merchantPages.campaigns.stopDescription")}
        confirmLabel={t("merchantPages.campaigns.stop")}
        danger
        loading={busy}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-input bg-beige/50 px-3 py-2">
      <dt className="text-xs text-navy/50">{label}</dt>
      <dd className="font-semibold text-navy">{value}</dd>
    </div>
  );
}

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "orange" | "navy";
}) {
  return (
    <div className="rounded-card border border-stroke bg-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-navy/45">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-extrabold tabular-nums",
          accent === "orange" ? "text-orange" : "text-navy",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CodeStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "available" | "claimed" | "total";
}) {
  const color =
    accent === "available"
      ? "text-emerald-600"
      : accent === "claimed"
        ? "text-navy"
        : "text-navy/40";
  return (
    <div className="rounded-card border border-stroke bg-surface px-3 py-2.5 text-center">
      <p className={cn("text-xl font-extrabold tabular-nums", color)}>{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy/45">
        {label}
      </p>
    </div>
  );
}

function ClaimedBy({
  name,
  linkName,
}: {
  name: string | null;
  linkName: string | null;
}) {
  const t = useT();
  if (!name && !linkName) {
    return <span className="text-navy/35">—</span>;
  }
  const display = name ?? linkName!;
  const initial = display.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange/12 text-xs font-bold text-orange">
        {initial}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-navy">{display}</p>
        {name && linkName && (
          <p className="truncate text-xs text-navy/45">
            {t("merchantPages.campaigns.viaLink", { name: linkName })}
          </p>
        )}
      </div>
    </div>
  );
}

function EditCampaignModal({
  open,
  onClose,
  onSave,
  busy,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (v: {
    name: string;
    terms: string;
    discount: string;
    commission: string;
    startAt: string;
    endAt: string;
  }) => void;
  busy: boolean;
  initial: {
    name: string;
    terms: string;
    discount: string;
    commission: string;
    startAt: string;
    endAt: string;
  };
}) {
  const t = useT();
  const [v, setV] = useState(initial);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("merchantPages.campaigns.editTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={busy} onClick={() => onSave(v)}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={t("merchantPages.campaignForm.name")} htmlFor="campaign-name">
          <Input
            id="campaign-name"
            name="campaign-name"
            autoComplete="off"
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </Field>
        <Field label={t("merchantPages.campaignForm.terms")} htmlFor="campaign-terms">
          <Textarea
            id="campaign-terms"
            name="campaign-terms"
            autoComplete="off"
            value={v.terms}
            onChange={(e) => setV({ ...v, terms: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("merchantPages.campaignForm.discount")} htmlFor="campaign-discount">
            <Input
              id="campaign-discount"
              name="campaign-discount"
              type="number"
              inputMode="decimal"
              value={v.discount}
              onChange={(e) => setV({ ...v, discount: e.target.value })}
            />
          </Field>
          <Field label={t("merchantPages.campaignForm.commission")} htmlFor="campaign-commission">
            <Input
              id="campaign-commission"
              name="campaign-commission"
              type="number"
              inputMode="decimal"
              value={v.commission}
              onChange={(e) => setV({ ...v, commission: e.target.value })}
            />
          </Field>
          <Field label={t("merchantPages.campaignForm.startDate")} htmlFor="campaign-start-date">
            <Input
              id="campaign-start-date"
              name="campaign-start-date"
              type="date"
              value={v.startAt}
              onChange={(e) => setV({ ...v, startAt: e.target.value })}
            />
          </Field>
          <Field label={t("merchantPages.campaignForm.endDate")} htmlFor="campaign-end-date">
            <Input
              id="campaign-end-date"
              name="campaign-end-date"
              type="date"
              value={v.endAt}
              onChange={(e) => setV({ ...v, endAt: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function AddCodesModal({
  open,
  onClose,
  onAdd,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (source: DiscountCodeSourceInput) => void;
  busy: boolean;
}) {
  const t = useT();
  const [mode, setMode] = useState<"generate" | "upload">("generate");
  const [prefix, setPrefix] = useState("PINTAP");
  const [count, setCount] = useState("10");
  const [uploaded, setUploaded] = useState("");

  function submit() {
    onAdd(
      mode === "generate"
        ? { kind: "generate", prefix, count: parseInt(count || "0", 10) }
        : {
            kind: "upload",
            codes: uploaded.split(/\r?\n/).map((c) => c.trim()).filter(Boolean),
          },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("merchantPages.campaigns.addCodesTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button loading={busy} onClick={submit}>
            {t("merchantPages.campaigns.addCodes")}
          </Button>
        </>
      }
    >
      <SegmentedControl
        options={[
          { value: "generate", label: t("merchantPages.campaignForm.generate") },
          { value: "upload", label: t("merchantPages.campaignForm.upload") },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === "generate" ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label={t("merchantPages.campaignForm.prefix")} htmlFor="new-code-prefix">
            <Input
              id="new-code-prefix"
              name="new-code-prefix"
              autoComplete="off"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
            />
          </Field>
          <Field label={t("merchantPages.campaignForm.count")} htmlFor="new-code-count" hint="1–500">
            <Input
              id="new-code-count"
              name="new-code-count"
              type="number"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </Field>
        </div>
      ) : (
        <Field label={t("merchantPages.campaignForm.codesOnePerLine")} htmlFor="new-codes" className="mt-4">
          <Textarea
            id="new-codes"
            name="new-codes"
            autoComplete="off"
            value={uploaded}
            onChange={(e) => setUploaded(e.target.value)}
            className="min-h-32 font-mono text-xs"
          />
        </Field>
      )}
    </Modal>
  );
}
