"use client";

import { useT } from "@/context/I18nProvider";
import { cn } from "@/lib/utils";

export type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "orange";

/** Bordered pastel chips, matching the Pintap Studio table/status badges. */
const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  orange: "border-orange/30 bg-orange/10 text-orange",
};

export default function Badge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  /** Optional leading icon (rendered at 12px). */
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon && <span className="-ml-0.5 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  // links
  active: "success",
  inactive: "neutral",
  deleted: "danger",
  // campaigns
  scheduled: "info",
  draft: "neutral",
  paused: "warning",
  ended: "neutral",
  // attributions
  confirmed: "success",
  pending: "warning",
  canceled: "neutral",
  returned: "danger",
  // stores
  connected: "success",
  disconnected: "danger",
  // funding
  funded: "success",
  partially_funded: "warning",
  not_funded: "neutral",
  manual_review: "danger",
  // payout batches / ledger
  requested: "orange",
  queued: "info",
  paid: "success",
  failed: "danger",
  available: "success",
  reversed: "danger",
};

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const t = useT();
  const key = `status.${status}`;
  const translated = t(key);
  return (
    <Badge tone={STATUS_TONES[status] ?? "neutral"} className={className}>
      {label ?? (translated === key ? titleCase(status) : translated)}
    </Badge>
  );
}
