import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

export default function Avatar({
  src,
  name,
  size = 36,
  className,
}: {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  const dims = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={dims}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  const [first, last] = (name ?? "").split(" ");
  return (
    <span
      style={dims}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-white",
        className,
      )}
      aria-hidden={!name}
    >
      {initials(first, last)}
    </span>
  );
}
