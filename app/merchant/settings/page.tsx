"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useMerchantStore } from "@/components/merchant/useMerchantStore";
import NoStore from "@/components/merchant/NoStore";
import ChangePasswordCard from "@/components/account/ChangePasswordCard";
import { storesService } from "@/services";
import { useT } from "@/context/I18nProvider";

export default function MerchantSettingsPage() {
  const t = useT();
  const { toast } = useToast();
  const { store, loading, reload } = useMerchantStore();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (store) setName(store.name);
  }, [store]);

  async function save() {
    if (!store) return;
    setSaving(true);
    try {
      await storesService.updateStore(store.id, { name });
      toast({ title: t("merchantPages.settings.saved"), variant: "success" });
      reload();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : t("merchantPages.settings.saveFailed"),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!store) {
    return (
      <div>
        <PageHeader title={t("merchantPages.settings.shortTitle")} />
        <NoStore />
        <div className="mx-auto mt-4 max-w-2xl">
          <ChangePasswordCard />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("merchantPages.settings.title")} />

      <div className="space-y-4">
        <Section title={t("merchantPages.settings.display")}>
          <Field label={t("merchantPages.settings.displayName")} htmlFor="name">
            <Input
              id="name"
              name="store-display-name"
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Button
            className="mt-4"
            variant="secondary"
            loading={saving}
            disabled={!name.trim() || name.trim() === store.name}
            onClick={save}
          >
            {t("common.save")}
          </Button>
          <p className="mt-2 text-xs text-navy/50">
            {t("merchantPages.settings.updatesDisabled")}
          </p>
        </Section>

        <ChangePasswordCard />
      </div>
    </div>
  );
}
