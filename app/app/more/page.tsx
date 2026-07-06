"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Card";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { authService } from "@/services";
import Avatar from "@/components/ui/Avatar";
import {
  ChevronRightIcon,
  EuroIcon,
  GlobeIcon,
  HelpIcon,
  LogOutIcon,
  ReceiptIcon,
  TrashIcon,
} from "@/components/ui/icons";

export default function MorePage() {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAppContext();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function signOut() {
    await authService.signOut();
    router.push("/login");
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await authService.deleteAccount();
      router.push("/login");
    } catch (e) {
      toast({
        title:
          e instanceof Error && e.message
            ? e.message
            : t("appPages.more.deleteAccountFailed"),
        variant: "error",
      });
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t("appPages.more.title")}
        description={t("appPages.more.description")}
      />

      <div className="space-y-4">
        <Section title={t("appPages.more.account")}>
          <Link
            href="/app/profile"
            className="flex items-center gap-3 rounded-input px-1 py-2 hover:bg-beige/50 focus-ring"
          >
            <Avatar
              src={user?.avatarUrl}
              name={user ? `${user.firstName} ${user.lastName}` : undefined}
              size={40}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-navy">
                {user ? `${user.firstName} ${user.lastName}` : "—"}
              </span>
              <span className="block truncate text-xs text-navy/55">
                {t("appPages.more.editProfile")}
              </span>
            </span>
            <span className="text-navy/30">
              <ChevronRightIcon />
            </span>
          </Link>
        </Section>

        {/* Earnings — reachable from the desktop sidebar, but the mobile bottom
            nav has no room for these, so surface them here too. */}
        <Section title={t("group.earnings")}>
          <div className="divide-y divide-stroke">
            <Link
              href="/app/orders"
              className="flex items-center gap-3 px-1 py-3 hover:bg-beige/40 focus-ring"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy/8 text-navy/65 [&>svg]:h-4 [&>svg]:w-4">
                <ReceiptIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-navy">
                  {t("nav.orders")}
                </span>
                <span className="block truncate text-xs text-navy/55">
                  {t("appPages.orders.description")}
                </span>
              </span>
              <span className="text-navy/30">
                <ChevronRightIcon />
              </span>
            </Link>
            <Link
              href="/app/payouts"
              className="flex items-center gap-3 px-1 py-3 hover:bg-beige/40 focus-ring"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy/8 text-navy/65 [&>svg]:h-4 [&>svg]:w-4">
                <EuroIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-navy">
                  {t("nav.payouts")}
                </span>
                <span className="block truncate text-xs text-navy/55">
                  {t("appPages.payouts.description")}
                </span>
              </span>
              <span className="text-navy/30">
                <ChevronRightIcon />
              </span>
            </Link>
          </div>
        </Section>

        <Section title={t("appPages.more.support")}>
          <div className="divide-y divide-stroke">
            <Link
              href="/app/help"
              className="flex items-center gap-3 px-1 py-3 hover:bg-beige/40 focus-ring"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy/8 text-navy/65 [&>svg]:h-4 [&>svg]:w-4">
                <HelpIcon />
              </span>
              <span className="flex-1 font-medium text-navy">
                {t("appPages.more.supportCenter")}
              </span>
              <span className="text-navy/30">
                <ChevronRightIcon />
              </span>
            </Link>
            <div className="flex items-center gap-3 px-1 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy/8 text-navy/65 [&>svg]:h-4 [&>svg]:w-4">
                <GlobeIcon />
              </span>
              <span className="flex-1 font-medium text-navy">
                {t("appPages.more.language")}
              </span>
              <LanguageSwitcher />
            </div>
          </div>
        </Section>

        <Section title={t("appPages.more.device")}>
          <div className="divide-y divide-stroke">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-input px-1 py-3 text-left hover:bg-red-50 focus-ring"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-red-600 [&>svg]:h-4 [&>svg]:w-4">
                <LogOutIcon />
              </span>
              <span className="flex-1 font-semibold text-red-600">
                {t("appPages.more.logoutDevice")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center gap-3 rounded-input px-1 py-3 text-left hover:bg-red-50 focus-ring"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-red-600 [&>svg]:h-4 [&>svg]:w-4">
                <TrashIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-red-600">
                  {t("appPages.more.deleteAccount")}
                </span>
                <span className="block text-xs text-navy/50">
                  {t("appPages.more.deleteAccountHint")}
                </span>
              </span>
            </button>
          </div>
        </Section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteAccount}
        title={t("appPages.more.deleteAccountTitle")}
        description={t("appPages.more.deleteAccountDescription")}
        confirmLabel={t("appPages.more.deleteAccount")}
        danger
        loading={deleting}
      />
    </div>
  );
}
