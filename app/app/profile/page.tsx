"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Card";
import Button, { buttonClasses } from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { authService } from "@/services";

export default function ProfilePage() {
  const { user, loading } = useAppContext();
  const t = useT();
  const router = useRouter();

  async function signOut() {
    await authService.signOut();
    router.push("/login");
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const genderLabel = user.gender
    ? t(`appPages.profile.genderOptions.${user.gender}`)
    : "—";
  const social = user.socialProfiles ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("appPages.profile.title")}
        description={t("appPages.profile.description")}
        actions={
          <Link href="/app/profile/edit" className={buttonClasses({})}>
            {t("appPages.profile.editProfile")}
          </Link>
        }
      />

      <div className="space-y-4">
        <Section title={t("appPages.profile.account")}>
          <div className="flex items-center gap-4">
            <Avatar
              src={user.avatarUrl}
              name={`${user.firstName} ${user.lastName}`}
              size={64}
            />
            <div className="min-w-0">
              <p className="truncate font-bold text-navy">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-sm text-navy/55">{user.email}</p>
              <div className="mt-1 flex gap-1">
                {user.roles.map((r) => (
                  <Badge key={r} tone="neutral">
                    {t(`roles.${r}`)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title={t("appPages.profile.personalInfo")}>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail label={t("appPages.profile.firstName")} value={user.firstName} />
            <Detail label={t("appPages.profile.lastName")} value={user.lastName} />
            <Detail label={t("appPages.profile.email")} value={user.email} />
            <Detail label={t("appPages.profile.phone")} value={user.phone ?? "—"} />
            <Detail label={t("appPages.profile.gender")} value={genderLabel} />
            <Detail label={t("appPages.profile.country")} value={user.country ?? "—"} />
          </dl>
        </Section>

        <Section title={t("appPages.profile.social")}>
          {social.length === 0 ? (
            <p className="text-sm text-navy/55">{t("appPages.profile.noSocial")}</p>
          ) : (
            <ul className="divide-y divide-stroke">
              {social.map((s, i) => (
                <li
                  key={`${s.platform}-${i}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="font-semibold text-navy">{s.platform}</span>
                  <span className="text-navy/60">{s.accountName}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Button variant="secondary" onClick={signOut}>
          {t("shell.signOut")}
        </Button>
      </div>
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
