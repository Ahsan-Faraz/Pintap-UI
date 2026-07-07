"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/context/I18nProvider";

const STEP_GREEN = "#086838";

function StepCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
      aria-hidden
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function CreateLinkStepper({ step }: { step: 1 | 2 | 3 }) {
  const t = useT();

  return (
    <div className="mb-8 flex items-center justify-center gap-1.5 sm:gap-2">
      <StepRow
        done={step > 1}
        active={step === 1 ? 1 : undefined}
        label={t("appPages.createLink.stepUrl")}
      />
      <StepConnector done={step > 1} />
      <StepRow
        done={step > 2}
        active={step === 2 ? 2 : undefined}
        label={t("appPages.createLink.stepCampaign")}
        muted={step < 2}
      />
      <StepConnector done={step > 2} />
      <StepRow
        active={step === 3 ? 3 : undefined}
        label={t("appPages.createLink.stepShare")}
        muted={step < 3}
      />
    </div>
  );
}

function StepRow({
  done,
  active,
  label,
  muted,
}: {
  done?: boolean;
  active?: number;
  label: string;
  muted?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
          active !== undefined && "bg-orange text-white",
          !done && active === undefined && "border border-navy/15 bg-white text-navy/35",
        )}
        style={done ? { backgroundColor: STEP_GREEN, color: "white" } : undefined}
      >
        {done ? <StepCheckIcon /> : active}
      </span>
      <span
        className={cn(
          "whitespace-nowrap text-sm font-bold",
          muted ? "text-navy/35" : "text-navy",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ done }: { done?: boolean }) {
  return (
    <div
      className={cn("h-0.5 w-6 shrink-0 sm:w-10", !done && "bg-navy/12")}
      style={done ? { backgroundColor: STEP_GREEN } : undefined}
      aria-hidden
    />
  );
}
