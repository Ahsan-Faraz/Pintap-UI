import {
  AlertIcon,
  CheckCircleIcon,
  InfoIcon,
} from "./icons";
import { cn } from "@/lib/utils";

export type BannerTone = "info" | "warning" | "danger" | "success";

type ToneStyle = {
  container: string;
  chip: string;
  icon: React.ReactNode;
};

const TONES: Record<BannerTone, ToneStyle> = {
  info: {
    container: "border-blue/40 bg-blue/10",
    chip: "bg-blue/20 text-[#0a6f93]",
    icon: <InfoIcon className="h-5 w-5" />,
  },
  warning: {
    container: "border-yellow/60 bg-yellow/15",
    chip: "bg-yellow/50 text-[#7a5b00]",
    icon: <AlertIcon className="h-5 w-5" />,
  },
  danger: {
    container: "border-red-200 bg-red-50",
    chip: "bg-red-100 text-red-700",
    icon: <AlertIcon className="h-5 w-5" />,
  },
  success: {
    container: "border-green/40 bg-green/10",
    chip: "bg-green/20 text-[#0c7a45]",
    icon: <CheckCircleIcon className="h-5 w-5" />,
  },
};

/**
 * Callout strip for alerts / attention prompts. Replaces ad-hoc inline alert
 * divs with a consistent icon-chip + copy + optional action layout.
 */
export default function Banner({
  tone = "info",
  title,
  children,
  action,
  icon,
  className,
}: {
  tone?: BannerTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  /** Override the default tone icon. */
  icon?: React.ReactNode;
  className?: string;
}) {
  const style = TONES[tone];
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-center",
        style.container,
        className,
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-input",
          style.chip,
        )}
      >
        {icon ?? style.icon}
      </span>
      <div className="min-w-0 flex-1">
        {title && (
          <p className="text-sm font-bold text-navy">{title}</p>
        )}
        {children && (
          <div className="mt-0.5 text-sm text-navy/70">{children}</div>
        )}
      </div>
      {action && <div className="shrink-0 sm:ml-2">{action}</div>}
    </div>
  );
}
