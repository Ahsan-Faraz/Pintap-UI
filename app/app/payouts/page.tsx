"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PayoutBalanceCard from "@/components/recommender/PayoutBalanceCard";
import KpiCard from "@/components/ui/KpiCard";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { Section } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { CheckCircleIcon, EuroIcon } from "@/components/ui/icons";
import { useAppContext } from "@/context/AppProvider";
import { useT, useLocale } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { ordersService, payoutsService } from "@/services";
import { formatCurrencyMinor, formatDate } from "@/lib/format";
import { MIN_PAYOUT_MINOR } from "@/lib/currency";
import type { OrderSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type LedgerEntry = NonNullable<
  Awaited<ReturnType<typeof payoutsService.getOverview>>
>["ledger"][number];

function formatPayoutDay(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

function ledgerTypeLabel(type: string): string {
  return type.replace(/_/g, " ");
}

export default function PayoutsPage() {
  const { user } = useAppContext();
  const t = useT();
  const { locale } = useLocale();
  const { toast } = useToast();
  const userId = user?.id;
  const bankSectionRef = useRef<HTMLDivElement>(null);

  const { data, loading, reload } = useAsync(
    () => (userId ? payoutsService.getOverview(userId) : Promise.resolve(null)),
    [userId],
  );

  const { data: orders } = useAsync(
    () =>
      userId ? ordersService.listOrdersForUser(userId) : Promise.resolve([]),
    [userId],
  );

  const account = data?.account ?? null;
  const onboarded = Boolean(account?.payoutsEnabled && account?.iban);
  const canRequestPayout = Boolean(
    data && data.availableMinor >= MIN_PAYOUT_MINOR && onboarded,
  );

  const upcoming = useMemo(
    () => (data?.ledger ?? []).filter((e) => e.status !== "paid"),
    [data?.ledger],
  );

  const completed = useMemo(
    () => (data?.ledger ?? []).filter((e) => e.status === "paid"),
    [data?.ledger],
  );

  const orderByAttribution = useMemo(() => {
    const map = new Map<string, OrderSummary>();
    for (const o of orders ?? []) {
      map.set(o.id, o);
    }
    return map;
  }, [orders]);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
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
  const currency = data?.currency ?? "EUR";

  function scrollToBank() {
    setEditing(true);
    bankSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

  const heroLabels = {
    availableBalance: t("appPages.payouts.availableBalance"),
    thresholdRemaining: (remaining: string, threshold: string) =>
      t("appPages.payouts.thresholdRemaining", { remaining, threshold }),
    thresholdReady: t("appPages.payouts.thresholdReady"),
    requestPayout: t("appPages.payouts.requestPayoutShort"),
    bankDetails: t("appPages.payouts.bankDetails"),
  };

  const requestHint = !onboarded
    ? t("appPages.payouts.requestNeedsBank")
    : data && data.availableMinor < MIN_PAYOUT_MINOR
      ? t("appPages.payouts.requestBelowMinimum")
      : null;

  return (
    <div className="mx-auto max-w-lg sm:max-w-4xl">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy">
          {t("appPages.payouts.title")}
        </h1>
        <p className="mt-1 text-sm text-navy/55">
          {t("appPages.payouts.description")}
        </p>
      </div>

      {/* Hero — available balance (replaces duplicate Available KPI) */}
      <div className="sm:hidden">
        <PayoutBalanceCard
          availableMinor={data?.availableMinor ?? 0}
          currency={currency}
          loading={loading}
          canRequest={canRequestPayout}
          requesting={requesting}
          onRequestPayout={() => void requestPayout()}
          onBankDetails={scrollToBank}
          labels={heroLabels}
          showActions
        />
      </div>
      <div className="hidden sm:block">
        <PayoutBalanceCard
          availableMinor={data?.availableMinor ?? 0}
          currency={currency}
          loading={loading}
          labels={heroLabels}
          showActions={false}
        />
      </div>

      {/* Pending + paid out only — available is on the hero card */}
      <div className="mt-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
        <KpiCard
          label={t("appPages.payouts.pending")}
          value={
            data ? formatCurrencyMinor(data.pendingMinor, currency) : "—"
          }
          icon={<EuroIcon />}
          loading={loading}
        />
        <KpiCard
          label={t("appPages.payouts.paidOut")}
          value={data ? formatCurrencyMinor(data.paidMinor, currency) : "—"}
          icon={<EuroIcon />}
          loading={loading}
        />
      </div>

      <div className="mt-5 hidden sm:block">
        <Button
          fullWidth
          onClick={() => void requestPayout()}
          loading={requesting}
          disabled={!canRequestPayout}
        >
          {t("appPages.payouts.requestPayment")}
        </Button>
        {requestHint ? (
          <p className="mt-2 text-center text-xs text-navy/55">{requestHint}</p>
        ) : null}
      </div>

      {requestHint ? (
        <p className="mt-3 text-center text-xs text-navy/55 sm:hidden">
          {requestHint}
        </p>
      ) : null}

      <div id="bank-details" ref={bankSectionRef} className="mt-5 scroll-mt-4">
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
                <Field
                  label={t("appPages.payouts.bankName")}
                  htmlFor="bank-name"
                >
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
                <Button onClick={() => void saveDetails()} loading={saving}>
                  {t("appPages.payouts.saveDetails")}
                </Button>
                {onboarded ? (
                  <Button
                    variant="ghost"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    {t("common.cancel")}
                  </Button>
                ) : null}
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

      <Section title={t("appPages.payouts.upcoming")} className="mt-5">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : upcoming.length === 0 ? (
          <EmptyState title={t("appPages.payouts.emptyUpcoming")} />
        ) : (
          <div className="divide-y divide-stroke">
            {upcoming.map((entry) => (
              <LedgerRow
                key={entry.id}
                entry={entry}
                order={
                  entry.attributionId
                    ? orderByAttribution.get(entry.attributionId)
                    : undefined
                }
                locale={locale}
              />
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
            {completed.map((entry) => (
              <LedgerRow
                key={entry.id}
                entry={entry}
                locale={locale}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function LedgerRow({
  entry,
  order,
  locale,
}: {
  entry: LedgerEntry;
  order?: OrderSummary;
  locale: string;
}) {
  const t = useT();
  const orderLabel = order?.orderNumber
    ? order.orderNumber.startsWith("#")
      ? order.orderNumber
      : `#${order.orderNumber}`
    : null;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold capitalize text-navy">
          {ledgerTypeLabel(entry.type)}
        </p>
        <p className="text-xs text-navy/50">{formatDate(entry.createdAt)}</p>
        {order ? (
          <p className="mt-0.5 truncate text-xs text-navy/45">
            {orderLabel ? `Order ${orderLabel}` : "Order"} ·{" "}
            {order.link?.name ?? "—"}
          </p>
        ) : null}
        {entry.availableAt && entry.status === "pending" ? (
          <p className="mt-0.5 text-xs text-navy/45">
            {t("appPages.payouts.clearsOn", {
              date: formatPayoutDay(entry.availableAt, locale),
            })}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge status={entry.status} />
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            entry.amountMinor < 0 ? "text-red-600" : "text-navy",
          )}
        >
          {formatCurrencyMinor(entry.amountMinor, entry.currency)}
        </span>
      </div>
    </div>
  );
}
