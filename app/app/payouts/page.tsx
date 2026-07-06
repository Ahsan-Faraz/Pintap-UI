"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import { Section } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { CheckCircleIcon, EuroIcon } from "@/components/ui/icons";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { payoutsService } from "@/services";
import { formatCurrencyMinor, formatDate } from "@/lib/format";
import { MIN_PAYOUT_MINOR } from "@/lib/currency";

export default function PayoutsPage() {
  const { user } = useAppContext();
  const t = useT();
  const { toast } = useToast();
  const userId = user?.id;

  const { data, loading, reload } = useAsync(
    () => (userId ? payoutsService.getOverview(userId) : Promise.resolve(null)),
    [userId],
  );

  const account = data?.account ?? null;
  const onboarded = Boolean(account?.payoutsEnabled && account?.iban);
  const canRequestPayout = Boolean(
    data && data.availableMinor >= MIN_PAYOUT_MINOR && onboarded,
  );
  const upcoming = (data?.ledger ?? []).filter((e) => e.status !== "paid");
  const completed = (data?.ledger ?? []).filter((e) => e.status === "paid");

  // --- bank details form -------------------------------------------------
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    accountHolder: "",
    iban: "",
    bic: "",
    bankName: "",
  });

  useEffect(() => {
    if (account) {
      setForm({
        accountHolder: account.accountHolder ?? "",
        iban: account.iban ?? "",
        bic: account.bic ?? "",
        bankName: account.bankName ?? "",
      });
    }
  }, [account]);

  const showForm = editing || !onboarded;

  // --- request payout ------------------------------------------------------
  const [requesting, setRequesting] = useState(false);

  async function requestPayout() {
    setRequesting(true);
    try {
      await payoutsService.requestPayout();
      toast({ title: t("appPages.payouts.requestedToast"), variant: "success" });
      reload();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Could not request the payout.",
        variant: "error",
      });
    } finally {
      setRequesting(false);
    }
  }

  async function saveDetails() {
    setSaving(true);
    try {
      await payoutsService.savePayoutAccount({
        accountHolder: form.accountHolder,
        iban: form.iban,
        bic: form.bic || null,
        bankName: form.bankName || null,
      });
      toast({ title: t("appPages.payouts.savedToast"), variant: "success" });
      setEditing(false);
      reload();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Could not save bank details.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("appPages.payouts.title")}
        description={t("appPages.payouts.description")}
      />

      <div className="mb-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <KpiCard
          label={t("appPages.payouts.available")}
          value={
            data ? formatCurrencyMinor(data.availableMinor, data.currency) : "—"
          }
          icon={<EuroIcon />}
          loading={loading}
          accent="green"
        />
        <KpiCard
          label={t("appPages.payouts.pending")}
          value={
            data ? formatCurrencyMinor(data.pendingMinor, data.currency) : "—"
          }
          icon={<EuroIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("appPages.payouts.paidOut")}
          value={
            data ? formatCurrencyMinor(data.paidMinor, data.currency) : "—"
          }
          icon={<EuroIcon />}
          loading={loading}
        />
      </div>

      {/* Request payout once available balance reaches the minimum threshold. */}
      <div className="mb-5">
        <Button
          fullWidth
          onClick={requestPayout}
          loading={requesting}
          disabled={!canRequestPayout}
        >
          {t("appPages.payouts.requestPayment")}
        </Button>
        {!onboarded ? (
          <p className="mt-2 text-center text-xs text-navy/55">
            {t("appPages.payouts.requestNeedsBank")}
          </p>
        ) : data && data.availableMinor < MIN_PAYOUT_MINOR ? (
          <p className="mt-2 text-center text-xs text-navy/55">
            {t("appPages.payouts.requestBelowMinimum")}
          </p>
        ) : null}
      </div>

      <div className="mb-5">
        <Section title={t("appPages.payouts.method")}>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : showForm ? (
            <div>
              <p className="mb-4 text-sm text-navy/65">
                {t("appPages.payouts.bankDetailsDescription")}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label={t("appPages.payouts.accountHolder")}
                  htmlFor="account-holder"
                >
                  <Input
                    id="account-holder"
                    name="accountHolder"
                    autoComplete="name"
                    value={form.accountHolder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, accountHolder: e.target.value }))
                    }
                  />
                </Field>
                <Field label={t("appPages.payouts.iban")} htmlFor="iban">
                  <Input
                    id="iban"
                    name="iban"
                    autoComplete="off"
                    placeholder="DE89 3704 0044 0532 0130 00"
                    value={form.iban}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, iban: e.target.value }))
                    }
                  />
                </Field>
                <Field label={t("appPages.payouts.bic")} htmlFor="bic">
                  <Input
                    id="bic"
                    name="bic"
                    autoComplete="off"
                    value={form.bic}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bic: e.target.value }))
                    }
                  />
                </Field>
                <Field label={t("appPages.payouts.bankName")} htmlFor="bank-name">
                  <Input
                    id="bank-name"
                    name="bankName"
                    autoComplete="off"
                    value={form.bankName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bankName: e.target.value }))
                    }
                  />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button onClick={saveDetails} loading={saving}>
                  {t("appPages.payouts.saveDetails")}
                </Button>
                {onboarded && (
                  <Button
                    variant="ghost"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    {t("common.cancel")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#0c7a45]">
                  <CheckCircleIcon />
                </span>
                <div>
                  <p className="font-semibold text-navy">
                    {t("appPages.payouts.onFile")}
                  </p>
                  <p className="text-xs text-navy/55">
                    {account?.accountHolder} ·{" "}
                    {account?.iban?.replace(/^(.{4}).+(.{4})$/, "$1 •••• $2")}
                  </p>
                  <p className="mt-0.5 text-xs text-navy/45">
                    {t("appPages.payouts.onFileDescription")}
                  </p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                {t("appPages.payouts.editDetails")}
              </Button>
            </div>
          )}
        </Section>
      </div>

      <Section title={t("appPages.payouts.upcoming")}>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : upcoming.length === 0 ? (
          <EmptyState title={t("appPages.payouts.emptyUpcoming")} />
        ) : (
          <div className="divide-y divide-stroke">
            {upcoming.map((e) => (
              <LedgerRow key={e.id} entry={e} />
            ))}
          </div>
        )}
      </Section>

      <Section title={t("appPages.payouts.completed")} className="mt-5">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : completed.length === 0 ? (
          <EmptyState title={t("appPages.payouts.emptyCompleted")} />
        ) : (
          <div className="divide-y divide-stroke">
            {completed.map((e) => (
              <LedgerRow key={e.id} entry={e} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

type LedgerEntry = NonNullable<
  Awaited<ReturnType<typeof payoutsService.getOverview>>
>["ledger"][number];

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-semibold capitalize text-navy">
          {entry.type.replace(/_/g, " ")}
        </p>
        <p className="text-xs text-navy/50">
          {formatDate(entry.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={entry.status} />
        <span
          className={`text-sm font-bold ${
            entry.amountMinor < 0 ? "text-red-600" : "text-navy"
          }`}
        >
          {formatCurrencyMinor(entry.amountMinor, entry.currency)}
        </span>
      </div>
    </div>
  );
}
