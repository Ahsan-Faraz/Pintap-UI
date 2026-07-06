"use client";

import { useEffect, useId } from "react";
import { useT } from "@/context/I18nProvider";
import { cn } from "@/lib/utils";

export default function Modal({
  open,
  onClose,
  title,
  description,
  eyebrow,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Small uppercase orange label shown above the title (Studio dialog eyebrow). */
  eyebrow?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const t = useT();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const width = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  }[size];

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-navy/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "relative max-h-[90vh] w-full animate-sheet-up overflow-y-auto overscroll-contain rounded-t-card border border-navy/15 bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_24px_50px_rgba(0,46,81,0.24)] sm:animate-scale-in sm:rounded-[20px] sm:pb-0",
          width,
        )}
      >
        {(title || description || eyebrow) && (
          <div className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4">
            <div>
              {eyebrow && (
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2
                  id={titleId}
                  className="text-lg font-extrabold text-navy"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="mt-0.5 text-sm text-navy/60">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-navy/50 hover:bg-navy/5 hover:text-navy focus-ring"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-navy/10 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
