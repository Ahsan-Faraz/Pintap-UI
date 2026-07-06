import { cn } from "@/lib/utils";

/**
 * Pintap brand logo. Renders the official brand SVGs straight from /public so
 * the artwork lives in exactly one place — edit the file and every logo in the
 * app updates:
 *   - full logo → /pintap-logo.svg  (flower + "pintap" wordmark + "Beta" pill)
 *   - mark only → /pintap-icon.svg  (four-petal flower, for collapsed nav)
 *
 * Sizing is controlled by callers via height utilities on the wrapper, e.g.
 * `className="[&_img]:h-12"` or `scale-110`.
 */
export default function Logo({
  className,
  markOnly = false,
}: {
  className?: string;
  markOnly?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={markOnly ? "/pintap-icon.svg" : "/pintap-logo.svg"}
        alt="Pintap"
        className={markOnly ? "h-8 w-8" : "h-8 w-auto"}
        draggable={false}
      />
    </span>
  );
}
