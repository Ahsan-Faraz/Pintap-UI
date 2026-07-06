import { cn } from "@/lib/utils";

export default function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // fade-up (transform-only), not fade-in: an opacity-gated entrance
        // leaves content invisible when the browser stalls animation timelines.
        "flex animate-fade-up flex-col items-center justify-center rounded-card border border-dashed border-navy/15 bg-surface/60 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-beige text-navy/50">
        {icon ?? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V5h14zM7 12h10v2H7zm0-4h10v2H7z" />
          </svg>
        )}
      </div>
      <h3 className="mt-4 text-base font-bold text-navy">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-navy/60">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
