"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type FilterDropdownOption<T extends string> = {
  value: T;
  label: string;
};

export default function FilterDropdown<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  name,
}: {
  value: T;
  onChange: (value: T) => void;
  options: FilterDropdownOption<T>[];
  "aria-label"?: string;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative w-full min-w-0 max-w-full">
      {name ? <input type="hidden" name={name} value={value} readOnly /> : null}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-input border border-navy/15 bg-surface px-3 text-left text-sm text-navy transition focus:border-orange focus:ring-2 focus:ring-orange/20 focus-ring"
      >
        <span className="min-w-0 truncate">{selected?.label ?? value}</span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 shrink-0 text-navy/45 transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <ul
            role="listbox"
            aria-labelledby={id}
            className="absolute inset-x-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-y-auto overflow-x-hidden rounded-input border border-navy/10 bg-surface p-1 shadow-[0_12px_28px_rgba(0,46,81,0.14)]"
          >
            {options.map((option) => {
              const active = option.value === value;
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full rounded-lg px-3 py-2.5 text-left text-sm transition focus-ring",
                      active
                        ? "bg-orange/10 font-semibold text-navy"
                        : "font-medium text-navy/75 hover:bg-beige/60",
                    )}
                  >
                    <span className="block min-w-0 break-words">{option.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
