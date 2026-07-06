import { cn } from "@/lib/utils";

export default function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs && (
        <div className="mb-2 text-sm text-navy/50">{breadcrumbs}</div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* min-w-0 + anywhere-wrap so long unbroken titles (URL-derived link
            names) wrap instead of forcing horizontal scroll on mobile. */}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy [overflow-wrap:anywhere]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-navy/60">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
