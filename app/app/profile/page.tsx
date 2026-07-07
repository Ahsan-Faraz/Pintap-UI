"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import {
  BellIcon,
  CardIcon,
  ChevronRightIcon,
  LockIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/ui/icons";
import { useAppContext } from "@/context/AppProvider";
import { useLocale, useT } from "@/context/I18nProvider";
import { useAsync } from "@/lib/hooks";
import { formatCurrencyMinor, formatNumber } from "@/lib/format";
import {
  analyticsService,
  authService,
  linksService,
  payoutsService,
  storesService,
} from "@/services";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const NOTIFICATIONS_KEY = "pintap:notifications:v1";

function profileHandle(user: Profile): string {
  const instagram = user.socialProfiles?.find(
    (p) => p.platform.toLowerCase() === "instagram",
  );
  if (instagram?.accountName.trim()) {
    const handle = instagram.accountName.trim();
    return handle.startsWith("@") ? handle : `@${handle}`;
  }
  const local = user.email.split("@")[0] ?? "user";
  return `@${local}`;
}

function memberSinceLabel(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
    month: "short",
    year: "numeric",
  });
}

function ibanLast4(iban: string | null | undefined): string | null {
  if (!iban) return null;
  const digits = iban.replace(/\s+/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function loadNotificationsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function ProfileSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition focus-ring",
        checked ? "bg-[#1E7E34]" : "bg-[#CBD5E1]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-navy/40">
      {children}
    </p>
  );
}

function RowIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EDF0F4] text-navy/55 [&>svg]:h-[18px] [&>svg]:w-[18px]">
      {children}
    </span>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  href,
  onClick,
  trailing,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const className =
    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#F8FAFC] focus-ring";

  const content = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-navy">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-sm text-navy/45">
            {subtitle}
          </span>
        ) : null}
      </span>
      {badge}
      {trailing ?? (
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-navy/25" />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export default function ProfilePage() {
  const { user, loading } = useAppContext();
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [notificationsOn, setNotificationsOn] = useState(true);

  useEffect(() => {
    setNotificationsOn(loadNotificationsEnabled());
  }, []);

  function setNotifications(next: boolean) {
    setNotificationsOn(next);
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, String(next));
    } catch {
      /* private browsing */
    }
  }

  const userId = user?.id;

  const { data: stats, loading: statsLoading } = useAsync(async () => {
    if (!userId) return null;
    const [links, shops, kpis, payout] = await Promise.all([
      linksService.listMyLinks(),
      storesService.getMyShops(userId),
      analyticsService.getRecommenderKpis(userId),
      payoutsService.getOverview(userId),
    ]);
    const lifetimeMinor =
      (payout?.paidMinor ?? 0) +
      (payout?.pendingMinor ?? 0) +
      (payout?.availableMinor ?? 0);
    return {
      linksCount: links.length,
      shopsCount: shops.length,
      lifetimeMinor,
      currency: payout?.currency ?? kpis.currency,
      payoutAccount: payout?.account ?? null,
      onboarded: Boolean(payout?.account?.payoutsEnabled && payout?.account?.iban),
    };
  }, [userId]);

  async function signOut() {
    await authService.signOut();
    router.push("/login");
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-lg space-y-4 sm:max-w-2xl">
        <Skeleton className="ml-auto h-9 w-9 rounded-full" />
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-52 w-full rounded-card" />
      </div>
    );
  }

  const handle = profileHandle(user);
  const since = memberSinceLabel(user.createdAt, locale);
  const instagram = user.socialProfiles?.find(
    (p) => p.platform.toLowerCase() === "instagram",
  );
  const instagramConnected = Boolean(instagram?.accountName.trim());
  const last4 = ibanLast4(stats?.payoutAccount?.iban);

  return (
    <div className="mx-auto max-w-lg pb-8 sm:max-w-2xl">
      <div className="mb-6 flex justify-end">
        <Link
          href="/app/profile/edit"
          aria-label={t("appPages.profile.editProfile")}
          className="grid h-9 w-9 place-items-center rounded-full text-navy/45 transition hover:bg-navy/5 hover:text-navy focus-ring"
        >
          <SettingsIcon className="h-5 w-5" />
        </Link>
      </div>

      <div className="mb-6 flex flex-col items-center text-center">
        <Avatar
          src={user.avatarUrl}
          name={`${user.firstName} ${user.lastName}`}
          size={96}
          className="text-2xl"
        />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-navy">
          {user.firstName} {user.lastName}
        </h1>
        <p className="mt-1 text-sm text-navy/45">
          {handle} · {t("appPages.profile.memberSince", { date: since })}
        </p>
      </div>

      <div className="app-flat-card mb-6 grid grid-cols-3 divide-x divide-[#E8ECF1] px-2 py-4">
        <StatCell
          label={t("appPages.profile.linksStat")}
          value={statsLoading ? "—" : formatNumber(stats?.linksCount ?? 0)}
        />
        <StatCell
          label={t("appPages.profile.shopsStat")}
          value={statsLoading ? "—" : formatNumber(stats?.shopsCount ?? 0)}
        />
        <StatCell
          label={t("appPages.profile.lifetimeStat")}
          value={
            statsLoading
              ? "—"
              : formatCurrencyMinor(
                  stats?.lifetimeMinor ?? 0,
                  stats?.currency,
                  { locale },
                )
          }
          accent
        />
      </div>

      <SectionLabel>{t("appPages.profile.account")}</SectionLabel>
      <div className="app-flat-card mb-6 divide-y divide-[#E8ECF1] overflow-hidden">
        <SettingsRow
          icon={
            <RowIcon>
              <UserIcon />
            </RowIcon>
          }
          title={t("appPages.profile.personalDetails")}
          subtitle={user.email}
          href="/app/profile/edit"
        />
        <SettingsRow
          icon={
            <RowIcon>
              <CardIcon />
            </RowIcon>
          }
          title={t("appPages.profile.payoutMethod")}
          subtitle={
            last4
              ? t("appPages.profile.bankMasked", { last4 })
              : t("appPages.profile.bankNotSet")
          }
          href="/app/payouts#bank-details"
          badge={
            stats?.onboarded ? (
              <span className="mr-1 inline-flex shrink-0 items-center rounded-full bg-green/15 px-2.5 py-0.5 text-xs font-semibold text-[#086838]">
                {t("appPages.profile.verified")}
              </span>
            ) : null
          }
          trailing={stats?.onboarded ? null : undefined}
        />
        <SettingsRow
          icon={
            <RowIcon>
              <LockIcon />
            </RowIcon>
          }
          title={t("appPages.profile.security")}
          subtitle={t("appPages.profile.securitySubtitle")}
          href="/app/profile/edit#security"
        />
      </div>

      <SectionLabel>{t("appPages.profile.sharing")}</SectionLabel>
      <div className="app-flat-card mb-8 divide-y divide-[#E8ECF1] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <RowIcon>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#E0F2FE] text-[#0284C7]">
              <InstagramGlyph className="h-4 w-4" />
            </span>
          </RowIcon>
          <Link
            href="/app/profile/edit"
            className="min-w-0 flex-1 focus-ring rounded-input"
          >
            <span className="block text-sm font-semibold text-navy">
              {t("appPages.profile.instagram")}
            </span>
            <span className="mt-0.5 block truncate text-sm text-navy/45">
              {instagramConnected
                ? t("appPages.profile.instagramConnected", { handle })
                : t("appPages.profile.instagramNotConnected")}
            </span>
          </Link>
          <ProfileSwitch
            checked={instagramConnected}
            onChange={() => router.push("/app/profile/edit")}
            label={t("appPages.profile.instagram")}
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <RowIcon>
            <BellIcon />
          </RowIcon>
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-navy">
              {t("appPages.profile.notifications")}
            </span>
            <span className="mt-0.5 block text-sm text-navy/45">
              {t("appPages.profile.notificationsSubtitle")}
            </span>
          </div>
          <ProfileSwitch
            checked={notificationsOn}
            onChange={setNotifications}
            label={t("appPages.profile.notifications")}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="mx-auto block text-sm font-semibold text-orange transition hover:text-orange/80 focus-ring"
      >
        {t("shell.signOut")}
      </button>
    </div>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-2 text-center">
      <p
        className={cn(
          "text-xl font-extrabold tabular-nums sm:text-2xl",
          accent ? "text-[#086838]" : "text-navy",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-navy/45">{label}</p>
    </div>
  );
}
