"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { useAppContext } from "@/context/AppProvider";
import { useT } from "@/context/I18nProvider";
import { authService } from "@/services";
import { cn } from "@/lib/utils";
import RoleSwitcher from "./RoleSwitcher";

export default function ProfileMenu({
  profileHref = "/app/profile",
}: {
  profileHref?: string;
}) {
  const { user } = useAppContext();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Close on any click outside the menu. A fixed inset-0 backdrop doesn't
    // work here: the header's backdrop-blur makes it the containing block for
    // fixed descendants, so a backdrop would only cover the header strip.
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (!user) return null;

  async function signOut() {
    await authService.signOut();
    router.push("/login");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("shell.openProfileMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-navy/14 bg-surface p-0.5 pr-3 text-sm font-semibold text-navy transition hover:border-navy/32 focus-ring"
      >
        <Avatar src={user.avatarUrl} name={`${user.firstName} ${user.lastName}`} size={30} />
        <span className="hidden sm:block">{user.firstName}</span>
      </button>

      {open && (
        <>
          <div
            className={cn(
              "absolute right-0 z-[100] mt-2 w-56 origin-top-right animate-dropdown-in rounded-2xl border border-navy/10 bg-surface p-2 shadow-[0_20px_35px_rgba(0,46,81,0.16)]",
            )}
            role="menu"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-bold text-navy">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-navy/55">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-navy/10" />
            <RoleSwitcher
              variant="menu"
              className="sm:hidden"
              onNavigate={() => setOpen(false)}
            />
            <div className="my-1 h-px bg-navy/10 sm:hidden" />
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-navy/80 hover:bg-beige/55 focus-ring"
              role="menuitem"
            >
              {t("shell.profile")}
            </Link>
            <Link
              href="/app/help"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-navy/80 hover:bg-beige/55 focus-ring"
              role="menuitem"
            >
              {t("shell.helpCenter")}
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="block w-full rounded-input px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 focus-ring"
              role="menuitem"
            >
              {t("shell.signOut")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
