"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Card";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { payoutsService } from "@/services";
import type { PayableUser, PayoutBatchRow } from "@/lib/types";
import { formatCurrencyMinor, formatDate } from "@/lib/format";

export default function AdminPayoutsPage() {
  const t = useT();
  const { toast } = useToast();
  const { data, loading, reload } = useAsync(async () => {
    const [payable, batches] = await Promise.all([
      payoutsService.listPayableUsers(),
      payoutsService.listPayoutBatches(),
    ]);
    return { payable, batches };
  }, []);

  const [busy, setBusy] = useState(false);
  const [queueTarget, setQueueTarget] = useState<PayableUser | null>(null);
  const [payTarget, setPayTarget] = useState<PayoutBatchRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PayoutBatchRow | null>(null);
  const [reference, setReference] = useState("");

  async function run(action: () => Promise<unknown>, successKey: string) {
    setBusy(true);
    try {
      await action();
      toast({ title: t(successKey), variant: "success" });
      setQueueTarget(null);
      setPayTarget(null);
      setCancelTarget(null);
      setReference("");
      reload();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Something went wrong.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const userName = (u: { firstName: string; lastName: string; email: string } | null) =>
    u ? `${u.firstName} ${u.lastName}`.trim() || u.email : "—";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t("adminPages.payouts.title")}
        description={t("adminPages.payouts.description")}
      />

      <div className="space-y-5">
        <Section title={t("adminPages.payouts.payable")}>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (data?.payable ?? []).length === 0 ? (
            <EmptyState title={t("adminPages.payouts.noPayable")} />
          ) : (
            <div className="divide-y divide-stroke">
              {(data?.payable ?? []).map((p) => (
                <div
                  key={p.user.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">
                      {userName(p.user)}
                    </p>
                    <p className="text-xs text-navy/50">{p.user.email}</p>
                    {p.account?.iban ? (
                      <p className="mt-1 break-all text-xs text-navy/60">
                        <span className="font-semibold">
                          {t("adminPages.payouts.bank")}:
                        </span>{" "}
                        {p.account.accountHolder} · {p.account.iban}
                        {p.account.bic ? ` · ${p.account.bic}` : ""}
                        {p.account.bankName ? ` · ${p.account.bankName}` : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-navy/45">
                        {t("adminPages.payouts.noBank")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#0c7a45]">
                        {formatCurrencyMinor(p.availableMinor, p.currency)}
                      </p>
                      <p className="text-xs text-navy/45">
                        {t("adminPages.payouts.pending", {
                          amount: formatCurrencyMinor(p.pendingMinor, p.currency),
                        })}
                      </p>
                    </div>
                    {p.onboarded ? (
                      <Badge tone="neutral">{t("adminPages.payouts.ready")}</Badge>
                    ) : (
                      <Badge tone="warning">{t("adminPages.payouts.notOnboarded")}</Badge>
                    )}
                    <Button
                      size="sm"
                      disabled={p.availableMinor <= 0 || busy}
                      onClick={() => setQueueTarget(p)}
                    >
                      {t("adminPages.payouts.queue")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={t("adminPages.payouts.batches")}>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (data?.batches ?? []).length === 0 ? (
            <EmptyState title={t("adminPages.payouts.noBatches")} />
          ) : (
            <div className="divide-y divide-stroke">
              {(data?.batches ?? []).map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-navy">
                      {formatCurrencyMinor(b.amountMinor, b.currency)}{" "}
                      <span className="font-normal text-navy/55">
                        {t("adminPages.payouts.batchUser", {
                          name: userName(b.user),
                        })}
                      </span>
                    </p>
                    <p className="text-xs text-navy/50">
                      {b.transferId
                        ? `${t("adminPages.payouts.transferRecorded")} · ${b.transferId}`
                        : t("adminPages.payouts.transferPending")}{" "}
                      · {formatDate(b.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={b.status} />
                    {/* 'requested' = user-initiated (self-service request payout). */}
                    {(b.status === "queued" || b.status === "requested") && (
                      <>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => setPayTarget(b)}
                        >
                          {t("adminPages.payouts.markPaid")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setCancelTarget(b)}
                        >
                          {t("adminPages.payouts.cancelBatch")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={queueTarget !== null}
        onClose={() => setQueueTarget(null)}
        onConfirm={() =>
          queueTarget &&
          run(
            () => payoutsService.queuePayout(queueTarget.user.id),
            "adminPages.payouts.queuedToast",
          )
        }
        title={t("adminPages.payouts.queueTitle")}
        description={
          queueTarget
            ? t("adminPages.payouts.queueDescription", {
                amount: formatCurrencyMinor(
                  queueTarget.availableMinor,
                  queueTarget.currency,
                ),
                name: userName(queueTarget.user),
              })
            : undefined
        }
        confirmLabel={t("adminPages.payouts.queue")}
        loading={busy}
      />

      <ConfirmDialog
        open={payTarget !== null}
        onClose={() => setPayTarget(null)}
        onConfirm={() =>
          payTarget &&
          run(
            () => payoutsService.markPayoutPaid(payTarget.id, reference),
            "adminPages.payouts.paidToast",
          )
        }
        title={t("adminPages.payouts.markPaidTitle")}
        description={
          payTarget ? (
            <div className="space-y-3">
              <p>
                {t("adminPages.payouts.markPaidDescription", {
                  amount: formatCurrencyMinor(
                    payTarget.amountMinor,
                    payTarget.currency,
                  ),
                })}
              </p>
              <Field
                label={t("adminPages.payouts.reference")}
                htmlFor="transfer-reference"
              >
                <Input
                  id="transfer-reference"
                  name="transferReference"
                  autoComplete="off"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </Field>
            </div>
          ) : undefined
        }
        confirmLabel={t("adminPages.payouts.markPaid")}
        loading={busy}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() =>
          cancelTarget &&
          run(
            () => payoutsService.cancelPayout(cancelTarget.id),
            "adminPages.payouts.canceledToast",
          )
        }
        title={t("adminPages.payouts.cancelTitle")}
        description={
          cancelTarget
            ? t("adminPages.payouts.cancelDescription", {
                amount: formatCurrencyMinor(
                  cancelTarget.amountMinor,
                  cancelTarget.currency,
                ),
              })
            : undefined
        }
        confirmLabel={t("adminPages.payouts.cancelBatch")}
        danger
        loading={busy}
      />
    </div>
  );
}
