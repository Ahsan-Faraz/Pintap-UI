"use client";

import { useState } from "react";
import { useT } from "@/context/I18nProvider";
import { cn } from "@/lib/utils";

export default function CopyButton({
  value,
  label,
  className,
  variant = "button",
}: {
  value: string;
  label?: string;
  className?: string;
  variant?: "button" | "icon";
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const idleLabel = label ?? t("appPages.linkDetail.copy");
  const copiedLabel = t("common.copied");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* Clipboard may be unavailable in some browsers. */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? copiedLabel : idleLabel}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-input border border-stroke bg-surface text-navy transition-colors hover:bg-navy/5 focus-ring",
          className,
        )}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-input border border-stroke bg-surface px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy/5 focus-ring",
        className,
      )}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? copiedLabel : idleLabel}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
