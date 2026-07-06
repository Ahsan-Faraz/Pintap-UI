import { cn } from "@/lib/utils";

/** Shimmering placeholder block (§9.4 skeleton loaders). */
export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[10px] bg-navy/5",
        "after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent after:[animation:pintap-shimmer_1.5s_infinite]",
        className,
      )}
    />
  );
}
