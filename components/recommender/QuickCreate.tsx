"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import PasteButton from "@/components/ui/PasteButton";
import { useT } from "@/context/I18nProvider";
import { isValidLinkUrl, normalizeLinkUrl } from "@/lib/url-utils";

/** Homepage hero "Create Link" section (R-01): URL input + Paste + Create Link CTA. */
export default function QuickCreate({
  variant = "default",
}: {
  /** `sidebar` = compact card for desktop home right column. */
  variant?: "default" | "sidebar";
}) {
  const router = useRouter();
  const t = useT();
  const [url, setUrl] = useState("");
  const valid = isValidLinkUrl(url);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeLinkUrl(url.trim());
    if (!normalized) return;
    router.push(`/app/create-link?url=${encodeURIComponent(normalized)}`);
  }

  if (variant === "sidebar") {
    return (
      <form onSubmit={go} className="app-flat-card p-5">
        <p className="text-base font-extrabold text-navy">
          {t("dashboard.user.desktop.createLinkTitle")}
        </p>
        <p className="mt-0.5 text-sm text-navy/55">
          {t("dashboard.user.quickCreateSubtitle")}
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            name="quick-create-url"
            aria-label={t("dashboard.user.quickCreateSubtitle")}
            autoComplete="off"
            type="text"
            inputMode="url"
            placeholder={t("dashboard.user.quickCreatePlaceholder")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={!valid}
            className="inline-flex shrink-0 items-center justify-center rounded-input bg-orange px-4 text-sm font-bold text-white transition hover:bg-orange/90 focus-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {t("dashboard.user.desktop.create")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={go}
      className="app-flat-card p-4 sm:p-5"
    >
      <p className="text-sm font-bold text-navy">
        {t("dashboard.user.createLinkTitle")}
      </p>
      <p className="mt-0.5 text-xs text-navy/55">
        {t("dashboard.user.quickCreateSubtitle")}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 gap-2">
          <Input
            name="quick-create-url"
            aria-label={t("dashboard.user.quickCreateSubtitle")}
            autoComplete="off"
            type="text"
            inputMode="url"
            placeholder={t("dashboard.user.quickCreatePlaceholder")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <PasteButton onPaste={setUrl} />
        </div>
        <Button type="submit" disabled={!valid}>
          {t("dashboard.user.createLinkCta")}
        </Button>
      </div>
    </form>
  );
}
