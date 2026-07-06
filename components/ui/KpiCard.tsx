import Card from "./Card";
import Skeleton from "./Skeleton";
import { TrendDownIcon, TrendUpIcon } from "./icons";
import { cn } from "@/lib/utils";

type Accent = "navy" | "green" | "orange" | "blue";

const ACCENT: Record<Accent, string> = {
  navy: "text-navy",
  green: "text-[#0c7a45]",
  orange: "text-orange",
  blue: "text-[#0a6f93]",
};

/** Soft tinted background for the leading icon chip, per accent. */
const CHIP: Record<Accent, string> = {
  navy: "bg-navy/8 text-navy",
  green: "bg-green/20 text-[#0c7a45]",
  orange: "bg-orange/15 text-orange",
  blue: "bg-blue/20 text-[#0a6f93]",
};

export type KpiTrend = {
  /** e.g. "12.5%" or "+340". */
  value: string;
  direction: "up" | "down";
  /** When true, a downward move is the good outcome (e.g. refunds). */
  invert?: boolean;
};

export default function KpiCard({
  label,
  value,
  hint,
  accent = "navy",
  icon,
  trend,
  loading = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: Accent;
  icon?: React.ReactNode;
  trend?: KpiTrend;
  loading?: boolean;
}) {
  const trendPositive = trend
    ? trend.invert
      ? trend.direction === "down"
      : trend.direction === "up"
    : false;

  return (
    <Card className="p-3 sm:p-5">
      {/* xs: icon stacked above the label so long labels ("COMMISSION",
          "BESTELLUNGEN") get the full card width instead of letter-stacking
          beside the chip. sm+: classic label-left / chip-right row. Never
          overflow-wrap:anywhere — it breaks words into vertical letter piles. */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        {icon && (
          <span
            className={cn(
              "order-first grid h-7 w-7 shrink-0 place-items-center rounded-lg sm:order-last sm:h-9 sm:w-9 sm:rounded-input [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-4 sm:[&>svg]:w-4",
              CHIP[accent],
            )}
          >
            {icon}
          </span>
        )}
        <p className="min-w-0 break-words text-[10px] font-bold uppercase tracking-[0.06em] text-navy/55 sm:text-xs sm:tracking-[0.12em]">
          {label}
        </p>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <p
          className={cn(
            "mt-2 text-xl font-extrabold tracking-tight sm:text-3xl",
            ACCENT[accent],
          )}
        >
          {value}
        </p>
      )}

      {!loading && (trend || hint) && (
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold",
                trendPositive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700",
              )}
            >
              {trend.direction === "up" ? (
                <TrendUpIcon className="h-3.5 w-3.5" />
              ) : (
                <TrendDownIcon className="h-3.5 w-3.5" />
              )}
              {trend.value}
            </span>
          )}
          {hint && <span className="text-xs text-navy/50">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
