import { cn } from "@/lib/utils";

/** Product/store image with a graceful placeholder. */
export default function Thumb({
  src,
  alt,
  className,
  width = 96,
  height = 96,
  fit = "cover",
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  fit?: "cover" | "contain";
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "grid place-items-center bg-beige text-navy/25",
          className,
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-1/3 w-1/3" fill="currentColor">
          <path d="M21 5H3a1 1 0 00-1 1v12a1 1 0 001 1h18a1 1 0 001-1V6a1 1 0 00-1-1zm-1 11.6l-4.3-4.3a1 1 0 00-1.4 0L11 15.6l-1.8-1.8a1 1 0 00-1.4 0L4 17.6V7h16zM7.5 11A1.5 1.5 0 109 9.5 1.5 1.5 0 007.5 11z" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={cn(fit === "contain" ? "object-contain" : "object-cover", className)}
    />
  );
}
