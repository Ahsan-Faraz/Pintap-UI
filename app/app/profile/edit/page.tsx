"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { authService } from "@/services";
import type { SocialProfile } from "@/lib/types";
import {
  COUNTRY_CODES,
  GENDER_VALUES,
  SOCIAL_PLATFORMS,
} from "@/lib/profile-options";
import {
  CameraIcon,
  LockIcon,
  LogOutIcon,
  TrashIcon,
} from "@/components/ui/icons";
import ChangePasswordCard from "@/components/account/ChangePasswordCard";

export default function ProfileEditPage() {
  const { user, loading, refresh } = useAppContext();
  const { toast } = useToast();
  const t = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "",
    country: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [social, setSocial] = useState<SocialProfile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender ?? "",
      country: user.country ?? "",
    });
    setAvatarUrl(user.avatarUrl);
    setSocial(
      user.socialProfiles && user.socialProfiles.length > 0
        ? user.socialProfiles
        : [{ platform: "Instagram", accountName: "" }],
    );
  }, [user]);

  function cancel() {
    router.push("/app/profile");
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      setAvatarUrl(await authService.uploadAvatar(file));
    } catch {
      toast({ title: t("appPages.profile.photoUploadFailed"), variant: "error" });
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  function setSocialAt(i: number, patch: Partial<SocialProfile>) {
    setSocial((list) => list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSocial() {
    setSocial((list) => [...list, { platform: "Instagram", accountName: "" }]);
  }
  function removeSocial(i: number) {
    setSocial((list) => list.filter((_, idx) => idx !== i));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = t("appPages.profile.required");
    if (!form.lastName.trim()) next.lastName = t("appPages.profile.required");
    if (!form.gender) next.gender = t("appPages.profile.required");
    if (!form.country) next.country = t("appPages.profile.required");
    // Social profiles are optional: untouched/blank rows are simply dropped on
    // save. Only a row with an account name needs a platform (and vice versa a
    // filled row with a blank name only errors when the user added extra rows).
    social.forEach((s, i) => {
      if (!s.accountName.trim()) {
        if (social.length > 1)
          next[`social-account-${i}`] = t("appPages.profile.required");
        return;
      }
      if (!s.platform) next[`social-platform-${i}`] = t("appPages.profile.required");
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      await authService.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        country: form.country || null,
        gender: form.gender || null,
        avatarUrl,
        socialProfiles: social.filter((s) => s.platform && s.accountName.trim()),
      });
      await refresh();
      toast({ title: t("appPages.profile.saved"), variant: "success" });
      router.push("/app/profile");
    } catch (e) {
      // Without this, a failed save (network/RLS) died silently — spinner
      // stopped and nothing told the user their changes weren't stored.
      toast({
        title:
          e instanceof Error && e.message
            ? e.message
            : t("appPages.profile.saveFailed"),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await authService.signOut();
    router.push("/login");
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const countries = COUNTRY_CODES.includes(
    form.country as (typeof COUNTRY_CODES)[number],
  )
    ? [...COUNTRY_CODES]
    : form.country
      ? [form.country, ...COUNTRY_CODES]
      : [...COUNTRY_CODES];

  return (
    <div className="mx-auto max-w-2xl pb-24">
      {/* Top bar: back, title, cancel (R-14). */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cancel}
            aria-label={t("common.back")}
            className="grid h-9 w-9 place-items-center rounded-full text-navy hover:bg-navy/5 focus-ring"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-xl font-extrabold text-navy">
            {t("appPages.profile.title")}
          </h1>
        </div>
        <button
          type="button"
          onClick={cancel}
          className="rounded-input px-2 py-1 text-sm font-semibold text-navy/60 hover:text-navy focus-ring"
        >
          {t("common.cancel")}
        </button>
      </div>

      <div className="space-y-4">
        <Section title={t("appPages.profile.personalInfo")}>
          <div className="flex items-center gap-4">
            <Avatar
              src={avatarUrl}
              name={`${form.firstName} ${form.lastName}`}
              size={64}
            />
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickPhoto}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileRef.current?.click()}
                loading={uploadingAvatar}
              >
                <CameraIcon className="h-4 w-4" />
                {t("appPages.profile.changePhoto")}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setAvatarUrl(null)}
                disabled={!avatarUrl}
              >
                <TrashIcon className="h-4 w-4" />
                {t("common.remove")}
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label={t("appPages.profile.firstName")}
              htmlFor="firstName"
              required
              error={errors.firstName}
            >
              <Input
                id="firstName"
                name="given-name"
                autoComplete="given-name"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </Field>
            <Field
              label={t("appPages.profile.lastName")}
              htmlFor="lastName"
              required
              error={errors.lastName}
            >
              <Input
                id="lastName"
                name="family-name"
                autoComplete="family-name"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </Field>

            <Field label={t("appPages.profile.email")} htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={user.email}
                disabled
                readOnly
              />
            </Field>
            <Field
              label={t("appPages.profile.gender")}
              htmlFor="gender"
              required
              error={errors.gender}
            >
              <Select
                id="gender"
                name="gender"
                autoComplete="off"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="">{t("appPages.profile.select")}</option>
                {GENDER_VALUES.map((g) => (
                  <option key={g} value={g}>
                    {t(`appPages.profile.genderOptions.${g}`)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={t("appPages.profile.country")}
              htmlFor="country"
              required
              error={errors.country}
            >
              <Select
                id="country"
                name="country"
                autoComplete="country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              >
                <option value="">{t("appPages.profile.select")}</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={t("appPages.profile.phone")}
              htmlFor="phone"
              hint={t("appPages.profile.phoneLocked")}
            >
              <div className="relative">
                <Input
                  id="phone"
                  name="tel"
                  type="tel"
                  value={user.phone ?? ""}
                  placeholder="—"
                  disabled
                  readOnly
                  className="pr-9"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 [&>svg]:h-4 [&>svg]:w-4">
                  <LockIcon />
                </span>
              </div>
            </Field>
          </div>
        </Section>

        <Section
          title={t("appPages.profile.social")}
          description={t("appPages.profile.socialDescription")}
        >
          <div className="space-y-3">
            {social.map((s, i) => (
              <div
                key={i}
                className="rounded-card border border-stroke p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-navy/45">
                    {t("appPages.profile.profileN", { n: i + 1 })}
                  </p>
                  {social.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSocial(i)}
                      className="rounded-input p-1 text-navy/40 hover:text-red-600 focus-ring [&>svg]:h-4 [&>svg]:w-4"
                      aria-label={t("common.remove")}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label={t("appPages.profile.platform")}
                    htmlFor={`platform-${i}`}
                    error={errors[`social-platform-${i}`]}
                  >
                    <Select
                      id={`platform-${i}`}
                      name={`platform-${i}`}
                      autoComplete="off"
                      value={s.platform}
                      onChange={(e) => setSocialAt(i, { platform: e.target.value })}
                    >
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label={t("appPages.profile.accountName")}
                    htmlFor={`account-${i}`}
                    error={errors[`social-account-${i}`]}
                  >
                    <Input
                      id={`account-${i}`}
                      name={`account-${i}`}
                      autoComplete="off"
                      placeholder={t("appPages.profile.handlePlaceholder")}
                      spellCheck={false}
                      value={s.accountName}
                      onChange={(e) =>
                        setSocialAt(i, { accountName: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addSocial}
              className="rounded-input text-sm font-semibold text-orange hover:underline focus-ring"
            >
              {t("appPages.profile.addProfile")}
            </button>
          </div>
        </Section>

        <ChangePasswordCard />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button fullWidth size="lg" loading={saving} onClick={save}>
            {t("appPages.profile.saveChanges")}
          </Button>
          <Button
            fullWidth
            size="lg"
            variant="secondary"
            onClick={signOut}
          >
            <LogOutIcon className="h-4 w-4" />
            {t("shell.signOut")}
          </Button>
        </div>
      </div>
    </div>
  );
}
