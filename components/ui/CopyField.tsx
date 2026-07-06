"use client";

import { useState } from "react";
import { CheckCircleIcon, CopyIcon } from "./icons";
import { useT } from "@/context/I18nProvider";
import { cn } from "@/lib/utils";

/**
 * Readonly value + integrated copy button presented as a single control,
 * matching the reference "referral link" pattern.
 */
export default function CopyField({
  value,
  label,
  className,
  variant = "navy",
}: {
  value: string;
  label?: string;
  className?: string;
  /** `orange` matches the mobile link-detail mock; `navy` is the default. */
  variant?: "navy" | "orange";
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* Clipboard may be unavailable in some browsers. */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-[16px] bg-white/80 p-1.5 pl-3 focus-within:ring-2 focus-within:ring-orange/20",
        variant === "orange"
          ? "clay-inset border-0"
          : "rounded-input border border-navy/15 bg-surface focus-within:border-orange",
        className,
      )}
    >
      <input
        readOnly
        name="shareable-link"
        autoComplete="off"
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 bg-transparent text-sm text-navy/80"
        aria-label={t("common.shareableLink")}
      />
      <button
        type="button"
        onClick={copy}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors focus-ring",
          variant === "orange"
            ? "clay-btn-orange rounded-[12px] px-4"
            : "rounded-[10px] bg-navy text-white hover:bg-navy/90",
        )}
      >
        {copied ? (
          <CheckCircleIcon className="h-4 w-4" />
        ) : (
          <CopyIcon className="h-4 w-4" />
        )}
        {copied ? t("common.copied") : (label ?? t("common.copyLink"))}
      </button>
    </div>
  );
}
