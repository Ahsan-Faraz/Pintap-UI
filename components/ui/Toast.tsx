"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

interface ToastContextValue {
  toast: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const ACCENT: Record<ToastVariant, string> = {
  default: "border-l-navy",
  success: "border-l-green",
  error: "border-l-red-500",
  info: "border-l-blue",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((t: ToastInput) => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, variant: "default", ...t }]);
    setTimeout(
      () => setItems((prev) => prev.filter((x) => x.id !== id)),
      3800,
    );
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[200] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
        aria-live="polite"
        aria-atomic="true"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto w-full max-w-sm animate-toast-in rounded-card border border-navy/10 border-l-4 bg-surface px-4 py-3 shadow-pop",
              ACCENT[t.variant],
            )}
          >
            <p className="text-sm font-bold text-navy">{t.title}</p>
            {t.description && (
              <p className="mt-0.5 text-sm text-navy/60">{t.description}</p>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
