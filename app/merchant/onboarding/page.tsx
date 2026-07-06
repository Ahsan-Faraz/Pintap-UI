"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Card";
import Button, { buttonClasses } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { CheckCircleIcon } from "@/components/ui/icons";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import {
  isMerchantOnboardingComplete,
  merchantOnboardingSteps,
} from "@/lib/merchant/onboarding";
import { normalizeStoreDomain } from "@/lib/url-utils";
import { formatDate } from "@/lib/format";
import { storesService } from "@/services";

export default function MerchantOnboardingPage() {
  const { store, reload } = useMerchantStore();
  const router = useRouter();
  const t = useT();
  const [domain, setDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const normalizedDomain = normalizeStoreDomain(domain);
  const valid = normalizedDomain !== null;
  const steps = merchantOnboardingSteps(store);
  const complete = isMerchantOnboardingComplete(store);

  const checklist = [
    { label: t("merchantPages.onboarding.connectStore"), done: steps.connectStore },
    { label: t("merchantPages.onboarding.confirmProfile"), done: steps.confirmProfile },
    {
      label: t("merchantPages.onboarding.firstCampaign"),
      done: steps.firstCampaign,
      href: "/merchant/campaigns/new",
    },
  ];

  async function handleConnect() {
    if (!normalizedDomain) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const result = await storesService.startStoreConnect(normalizedDomain);
      if (!result.ok) {
        setConnectError(
          translateError(t, new Error(result.error), "errors.connectStoreFailed"),
        );
        return;
      }
      await reload();
    } catch (err) {
      setConnectError(translateError(t, err, "errors.connectStoreFailed"));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("merchantPages.onboarding.title")}
        description={t("merchantPages.onboarding.description")}
      />

      <Section title={t("merchantPages.onboarding.checklist")} className="mb-4">
        <ol className="space-y-3">
          {checklist.map((s, i) => (
            <li key={s.label} className="flex items-center gap-3">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  s.done
                    ? "bg-green/20 text-[#0c7a45]"
                    : "bg-navy/5 text-navy/50"
                }`}
              >
                {s.done ? <CheckCircleIcon className="h-5 w-5" /> : i + 1}
              </span>
              <span
                className={`flex-1 text-sm font-medium ${s.done ? "text-navy/50 line-through" : "text-navy"}`}
              >
                {s.label}
              </span>
              {!s.done && s.href && (
                <Link
                  href={s.href}
                  className="rounded-input text-sm font-semibold text-orange hover:underline focus-ring"
                >
                  {t("merchantPages.onboarding.go")}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </Section>

      {complete ? (
        <Section title={t("merchantPages.onboarding.completeTitle")}>
          <p className="text-sm text-navy/70">
            {t("merchantPages.onboarding.completeDescription")}
          </p>
          <Button
            className="mt-5"
            onClick={() => router.push("/merchant")}
          >
            {t("merchantPages.onboarding.goToDashboard")}
          </Button>
        </Section>
      ) : store?.connected ? (
        <Section title={t("merchantPages.onboarding.connectedStore")}>
          <div className="flex items-center gap-2">
            <Badge tone="success">{t("status.connected")}</Badge>
            <span className="text-sm font-semibold text-navy">{store.name}</span>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Detail label={t("merchantPages.store.domain")} value={store.merchantDomain} />
            <Detail label={t("merchantPages.store.storefrontDomain")} value={store.primaryDomain} />
            <Detail label={t("merchantPages.store.externalId")} value={store.externalId} />
            <Detail
              label={t("merchantPages.store.installed")}
              value={store.connectedAt ? formatDate(store.connectedAt) : "—"}
            />
          </dl>
          {!steps.firstCampaign ? (
            <Link
              href="/merchant/campaigns/new"
              className={buttonClasses({ className: "mt-5" })}
            >
              {t("merchantPages.onboarding.firstCampaign")}
            </Link>
          ) : null}
        </Section>
      ) : (
        <Section
          title={t("merchantPages.onboarding.connectStore")}
          description={t("merchantPages.onboarding.connectDescription")}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleConnect();
            }}
          >
            <Field
              label={t("merchantPages.store.domain")}
              htmlFor="domain"
              hint={t("merchantPages.onboarding.domainHint")}
              error={connectError ?? undefined}
            >
              <Input
                id="domain"
                name="store-domain"
                autoComplete="off"
                placeholder={t("merchantPages.onboarding.domainPlaceholder")}
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  if (connectError) setConnectError(null);
                }}
                autoCapitalize="none"
                spellCheck={false}
              />
            </Field>
            {normalizedDomain && normalizedDomain !== domain.trim().toLowerCase() && (
              <p className="mt-2 text-xs text-navy/50">
                {t("merchantPages.onboarding.domainNormalized", {
                  domain: normalizedDomain,
                })}
              </p>
            )}
            <Button
              type="submit"
              className="mt-4"
              loading={connecting}
              disabled={!valid || connecting}
            >
              {t("merchantPages.onboarding.connectStore")}
            </Button>
          </form>
          {domain && !valid ? (
            <p className="mt-3 text-xs text-navy/50">
              {t("merchantPages.onboarding.invalidDomain")}
            </p>
          ) : null}
        </Section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-input bg-beige/50 px-3 py-2">
      <dt className="text-xs text-navy/50">{label}</dt>
      <dd className="font-semibold text-navy">{value ?? "—"}</dd>
    </div>
  );
}
