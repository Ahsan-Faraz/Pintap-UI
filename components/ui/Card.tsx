import { cn } from "@/lib/utils";

export default function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-navy/10 bg-surface shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Card with a titled header row and optional right-aligned action. */
export function Section({
  title,
  description,
  eyebrow,
  icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Small uppercase label shown above the title. */
  eyebrow?: React.ReactNode;
  /** Leading icon rendered in a tinted chip beside the title. */
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={className}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-navy/10 px-5 py-4">
          <div className="flex items-start gap-3">
            {icon && (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-input bg-navy/8 text-navy">
                {icon}
              </span>
            )}
            <div>
              {eyebrow && (
                <p className="text-xs font-bold uppercase tracking-wider text-navy/40">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2 className="text-base font-extrabold text-navy">{title}</h2>
              )}
              {description && (
                <p className="mt-0.5 text-sm text-navy/60">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}
