"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";
import {
  CompassIcon,
  HomeIcon,
  LinkIcon,
  PlusIcon,
  ReceiptIcon,
  UserIcon,
  EuroIcon,
  HelpIcon,
  MenuIcon,
  MoreIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useT } from "@/context/I18nProvider";
import ProfileMenu from "@/components/portal/ProfileMenu";
import RoleSwitcher from "@/components/portal/RoleSwitcher";

const GROUPS = [
  {
    labelKey: "group.main",
    items: [
      { href: "/app", labelKey: "nav.home", icon: <HomeIcon /> },
      { href: "/app/links", labelKey: "nav.links", icon: <LinkIcon /> },
      { href: "/app/create-link", labelKey: "nav.create", icon: <PlusIcon /> },
      { href: "/app/discover", labelKey: "nav.discover", icon: <CompassIcon /> },
    ],
  },
  {
    labelKey: "group.earnings",
    items: [
      { href: "/app/orders", labelKey: "nav.orders", icon: <ReceiptIcon /> },
      { href: "/app/payouts", labelKey: "nav.payouts", icon: <EuroIcon /> },
    ],
  },
  {
    labelKey: "group.account",
    items: [
      { href: "/app/profile", labelKey: "nav.profile", icon: <UserIcon /> },
      { href: "/app/more", labelKey: "nav.more", icon: <MoreIcon /> },
      { href: "/app/help", labelKey: "nav.help", icon: <HelpIcon /> },
    ],
  },
];

const NAV = GROUPS.flatMap((g) => g.items);

// Bottom-nav set for mobile: Home, Links, Create (center), Shops, More.
const BOTTOM = ["/app", "/app/links", "/app/create-link", "/app/discover", "/app/more"];

export default function RecommenderShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  // Optimistic tab highlight: mark the tapped tab active immediately instead of
  // waiting for the route to render (client reported taps "not working" and
  // tapping twice — the missing instant feedback made navigation feel dead).
  // Reset-during-render (not an effect) once the route actually changed.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    setPendingHref(null);
  }
  const isActive = (href: string) =>
    pendingHref
      ? pendingHref === href
      : href === "/app"
        ? pathname === "/app"
        : pathname.startsWith(href);

  const bottomItems = BOTTOM.map((h) => NAV.find((n) => n.href === h)!);

  const sidebar = (showLabels: boolean) => (
    <>
      <div
        className={cn(
          "flex h-16 items-center",
          showLabels ? "px-5" : "justify-center px-2",
        )}
      >
        <Logo markOnly={!showLabels} />
      </div>
      <nav className="flex-1 space-y-5 px-3 pb-4">
        {GROUPS.map((group) => (
          <div key={group.labelKey} className="space-y-1">
            {showLabels && (
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-navy/35">
                {t(group.labelKey)}
              </p>
            )}
            {group.items.map((it) => {
              const active = isActive(it.href);
              const label = t(it.labelKey);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  title={showLabels ? undefined : label}
                  aria-label={label}
                  className={cn(
                    "group flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-semibold transition",
                    !showLabels && "justify-center px-2",
                    active
                      ? "bg-orange/12 text-navy"
                      : "text-navy/[0.78] hover:bg-beige/55 hover:text-navy",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition [&>svg]:h-4 [&>svg]:w-4",
                      active
                        ? "bg-orange text-white"
                        : "bg-navy/8 text-navy/65 group-hover:bg-beige",
                    )}
                  >
                    {it.icon}
                  </span>
                  {showLabels && <span className="flex-1">{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-app-mesh text-navy">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-navy/10 bg-surface shadow-rail transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[88px]" : "w-[256px]",
        )}
      >
        {sidebar(!collapsed)}
      </aside>

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[88px]" : "lg:pl-[256px]",
        )}
      >
        {/* Top header */}
        <header className="sticky top-0 z-20 border-b border-navy/10 bg-surface/80 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
            <div className="lg:hidden">
              <Logo />
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={
                collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")
              }
              aria-pressed={collapsed}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-navy/15 bg-surface text-navy transition hover:border-navy/35 focus-ring lg:inline-flex"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <RoleSwitcher variant="pills" className="hidden sm:flex" />
              <ProfileMenu profileHref="/app/profile" />
            </div>
          </div>
        </header>

        {/* Content (extra bottom padding to clear the mobile tab bar) */}
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8"
        >
          {/* Re-keyed per route so each page gets a soft fade-up entrance. */}
          <div key={pathname} className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-navy/10 bg-surface/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {bottomItems.map((it) => {
            const active = isActive(it.href);
            const isCreate = it.href === "/app/create-link";
            if (isCreate) {
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-label={t("nav.create")}
                  className="grid h-12 w-12 -translate-y-3 touch-manipulation place-items-center rounded-full bg-orange text-white shadow-pop transition-transform duration-150 active:scale-90 focus-ring"
                >
                  <PlusIcon />
                </Link>
              );
            }
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setPendingHref(it.href)}
                className={cn(
                  "relative flex flex-1 touch-manipulation flex-col items-center gap-0.5 rounded-input py-1 text-[11px] font-semibold transition-colors focus-ring",
                  active ? "text-orange" : "text-navy/55 hover:text-navy",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute -top-1.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-orange"
                  />
                )}
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full transition-colors [&>svg]:h-5 [&>svg]:w-5",
                    active && "bg-orange/12",
                  )}
                >
                  {it.icon}
                </span>
                {t(it.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
