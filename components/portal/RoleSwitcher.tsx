"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The portals a user can switch between, keyed by the role that unlocks them. */
const WORKSPACES: { role: Role; labelKey: string; href: string }[] = [
  { role: "user", labelKey: "roles.user", href: "/app" },
  { role: "merchant", labelKey: "roles.merchant", href: "/merchant" },
  { role: "admin", labelKey: "roles.admin", href: "/admin" },
];

function activeRole(pathname: string): Role | null {
  for (const w of WORKSPACES) {
    if (pathname === w.href || pathname.startsWith(`${w.href}/`)) return w.role;
  }
  return null;
}

/**
 * Lets a multi-role user jump between their portals (Studio "role pills").
 * Renders nothing for single-role users. `variant="menu"` is a stacked list for
 * the profile dropdown on mobile, where the header pills are hidden.
 */
export default function RoleSwitcher({
  variant = "pills",
  className,
  onNavigate,
}: {
  variant?: "pills" | "menu";
  className?: string;
  onNavigate?: () => void;
}) {
  const { user } = useAppContext();
  const pathname = usePathname();
  const t = useT();

  if (!user) return null;
  const available = WORKSPACES.filter((w) => user.roles.includes(w.role));
  if (available.length < 2) return null;

  const active = activeRole(pathname);

  if (variant === "menu") {
    return (
      <div className={className}>
        <p className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-navy/40">
          {t("shell.workspace")}
        </p>
        {available.map((w) => {
          const isActive = w.role === active;
          return (
            <Link
              key={w.role}
              href={w.href}
              role="menuitem"
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition",
                isActive
                  ? "bg-orange/12 text-navy"
                  : "text-navy/80 hover:bg-beige/55",
              )}
            >
              {t(w.labelKey)}
              {isActive && (
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
                  {t("shell.current")}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn("items-center gap-1.5", className)}
      role="group"
      aria-label={t("shell.switchWorkspace")}
    >
      {available.map((w) => {
        const isActive = w.role === active;
        return (
          <Link
            key={w.role}
            href={w.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition",
              isActive
                ? "border-orange bg-orange text-white"
                : "border-navy/20 bg-surface text-navy hover:border-navy/40",
            )}
          >
            {t(w.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
