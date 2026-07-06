import { cn } from "@/lib/utils";

/**
 * Horizontal, swipeable rail for homepage "active links" / "my shops" sections
 * (R-04 / R-06). Children should be fixed-width and add `snap-start shrink-0`.
 * Works with touch-swipe and mouse/trackpad; newest items go first (leftmost).
 */
export default function CardRail({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2",
        "[scrollbar-width:thin] [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      {children}
    </div>
  );
}
