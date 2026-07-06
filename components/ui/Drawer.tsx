"use client";

import { useEffect, useId } from "react";
import { useT } from "@/context/I18nProvider";
import { cn } from "@/lib/utils";

/** Side sheet for mobile-friendly detail views (§9.4 drawer/sheet). */
export default function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = useT();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150]"
    >
      <div
        className="absolute inset-0 animate-fade-in bg-navy/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in-right flex-col overscroll-contain border-l border-navy/10 bg-surface shadow-pop sm:rounded-l-[20px]",
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-navy/10 px-5 py-4">
          <h2 id={titleId} className="text-lg font-extrabold text-navy">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="grid h-8 w-8 place-items-center rounded-full text-navy/50 hover:bg-navy/5 hover:text-navy focus-ring"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="border-t border-navy/10 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
