"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { MenuIcon, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useT } from "@/context/I18nProvider";
import type { Translator } from "@/lib/i18n/translate";
import ProfileMenu from "./ProfileMenu";
import RoleSwitcher from "./RoleSwitcher";

export interface NavItem {
  href: string;
  /** Translation key for the item label (e.g. "nav.dashboard"). */
  labelKey: string;
  icon: React.ReactNode;
}

export interface NavGroup {
  /** Translation key for the uppercase section label. */
  labelKey?: string;
  items: NavItem[];
}

type ResolvedPage = { href: string; label: string; icon: React.ReactNode };

/** Sidebar + sticky-header shell shared by the merchant and admin portals. */
export default function PortalShell({
  sectionKey,
  groups,
  profileHref,
  children,
}: {
  /** Translation key for the portal name shown above the nav (e.g. "section.admin"). */
  sectionKey: string;
  groups: NavGroup[];
  profileHref?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail
  const base = groups[0]?.items[0]?.href ?? "/";

  const isActive = (href: string) =>
    href === base
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  const sidebar = (showLabels: boolean) => (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 items-center",
          showLabels ? "px-5" : "justify-center px-2",
        )}
      >
        <Logo markOnly={!showLabels} />
      </div>
      {showLabels && (
        <p className="px-5 pb-3 text-xs font-bold uppercase tracking-[0.12em] text-navy/44">
          {t(sectionKey)}
        </p>
      )}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((group, gi) => (
          <div key={group.labelKey ?? gi} className="space-y-1">
            {showLabels && group.labelKey && (
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
                  onClick={() => setOpen(false)}
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
    </div>
  );

  const pages: ResolvedPage[] = groups
    .flatMap((g) => g.items)
    .map((it) => ({ href: it.href, label: t(it.labelKey), icon: it.icon }));

  return (
    <div className="min-h-screen bg-app-mesh text-navy">
      {/* Desktop sidebar (fixed rail) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-navy/10 bg-surface shadow-rail transition-[width] duration-200 lg:flex",
          collapsed ? "w-[88px]" : "w-[280px]",
        )}
      >
        {sidebar(!collapsed)}
      </aside>

      {/* Mobile slide-in sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-[120] lg:hidden",
          open ? "" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            "absolute inset-0 bg-navy/40 transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-[280px] overscroll-contain border-r border-navy/10 bg-surface shadow-pop transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebar(true)}
        </aside>
      </div>

      {/* Main column */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[88px]" : "lg:pl-[280px]",
        )}
      >
        <header className="sticky top-0 z-20 border-b border-navy/10 bg-surface/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t("shell.openMenu")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-navy/15 bg-surface text-navy transition hover:border-navy/35 focus-ring lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
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

            <QuickSearch
              pages={pages}
              t={t}
              onNavigate={(href) => router.push(href)}
            />

            <div className="ml-auto flex items-center gap-3">
              <RoleSwitcher variant="pills" className="hidden sm:flex" />
              <LanguageSwitcher />
              <ProfileMenu profileHref={profileHref} />
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8"
        >
          {/* Re-keyed per route so each page gets a soft fade-up entrance. */}
          <div key={pathname} className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/** Header quick-search that filters this role's pages and navigates on select. */
function QuickSearch({
  pages,
  t,
  onNavigate,
}: {
  pages: ResolvedPage[];
  t: Translator;
  onNavigate: (href: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return pages.filter((p) => p.label.toLowerCase().includes(q));
  }, [pages, query]);

  const showMenu = open && query.trim().length > 0;

  function go(href: string) {
    setQuery("");
    setOpen(false);
    onNavigate(href);
  }

  return (
    <div className="relative min-w-0 flex-1 sm:min-w-[260px] md:max-w-[520px]">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" />
      <input
        name="portal-search"
        aria-label={t("shell.searchPages")}
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t("shell.searchPages")}
        className="h-10 w-full rounded-xl border border-navy/15 bg-surface py-2 pl-10 pr-3 text-sm text-navy outline-none transition placeholder:text-navy/40 focus:border-orange focus:ring-2 focus:ring-orange/20"
      />
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 right-0 top-[44px] z-50 origin-top animate-dropdown-in rounded-xl border border-navy/10 bg-surface p-1.5 shadow-[0_18px_28px_rgba(0,46,81,0.15)]">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-sm text-navy/55">
                {t("shell.noPagesFound")}
              </p>
            ) : (
              results.map((p) => (
                <button
                  key={p.href}
                  type="button"
                  onClick={() => go(p.href)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-navy/85 transition hover:bg-beige/60"
                >
                  <span className="text-navy/45 [&>svg]:h-4 [&>svg]:w-4">
                    {p.icon}
                  </span>
                  {p.label}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
