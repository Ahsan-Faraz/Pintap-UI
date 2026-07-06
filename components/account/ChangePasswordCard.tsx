"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/context/I18nProvider";
import { translateError } from "@/lib/i18n/errors";
import { authService } from "@/services";

const MIN_LENGTH = 8;

/**
 * Change-password form shared by every portal's account/settings page.
 * Verifies the current password before updating (see authService.changePassword).
 */
export default function ChangePasswordCard() {
  const t = useT();
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!current) e.current = t("account.required");
    if (next.length < MIN_LENGTH) e.next = t("account.passwordTooShort");
    else if (current && current === next) e.next = t("account.samePassword");
    if (confirm !== next) e.confirm = t("account.passwordsDoNotMatch");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await authService.changePassword(current, next);
      toast({ title: t("account.passwordUpdated"), variant: "success" });
      setCurrent("");
      setNext("");
      setConfirm("");
      setErrors({});
    } catch (err) {
      toast({
        title: translateError(t, err, "account.passwordUpdateFailed"),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title={t("account.passwordTitle")}
      description={t("account.passwordDescription")}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          label={t("account.currentPassword")}
          htmlFor="current-password"
          error={errors.current}
        >
          <Input
            id="current-password"
            name="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("account.newPassword")}
            htmlFor="new-password"
            hint={t("account.passwordHint")}
            error={errors.next}
          >
            <Input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field
            label={t("account.confirmPassword")}
            htmlFor="confirm-password"
            error={errors.confirm}
          >
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
        </div>
        <Button type="submit" loading={saving}>
          {t("account.updatePassword")}
        </Button>
      </form>
    </Section>
  );
}
