"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavIcon } from "@/components/NavIcon";
import { SignOutButton } from "@/components/SignOutButton";
import { ADMIN_NAV, FACULTY_NAV, resolveBreadcrumb, type NavItem } from "@/lib/nav";
import { CATALOG_SCREENS, catalogRoute } from "@/lib/screens";

export type AppChromeKind = "faculty" | "admin";

export type AppChromeProps = {
  /** Demo `cons(kind)` — faculty teaching console or owner/admin console. */
  kind?: AppChromeKind;
  /** Alias for `kind` used by some catalog routes (`role="faculty"`). */
  role?: AppChromeKind;
  /** Demo `tnav` label, e.g. `"Schedule"`. Optional if `screenId` or the URL can be used. */
  active?: string;
  /** Catalog screen id. `session-pre` highlights Schedule. Never a invented id. */
  screenId?: string;
  children: ReactNode;
};

function screenIdFromPath(pathname: string): string | undefined {
  return CATALOG_SCREENS.find((s) => s.route === pathname)?.id;
}

function navItemActive(it: NavItem, activeLabel?: string, currentId?: string, pathname?: string) {
  if (activeLabel) {
    if (it.label === activeLabel) return true;
    if (it.destId === "roster" && (activeLabel === "Students" || activeLabel === "Cohorts")) return true;
    return false;
  }
  if (currentId && it.match.includes(currentId)) return true;
  if (pathname && catalogRoute(it.destId) === pathname) return true;
  return false;
}

export function AppChrome({ kind, role, active, screenId, children }: AppChromeProps) {
  const pathname = usePathname();
  const resolvedKind: AppChromeKind = kind ?? role ?? "faculty";
  const items = resolvedKind === "admin" ? ADMIN_NAV : FACULTY_NAV;
  const currentId = screenId ?? screenIdFromPath(pathname);
  const tint = resolvedKind === "admin" ? "tint-violet" : "tint-sky";
  const homeId = resolvedKind === "admin" ? "owner" : "teacher-dash";
  const breadcrumb = resolveBreadcrumb(items, currentId);
  const currentTitle = CATALOG_SCREENS.find((s) => s.id === currentId)?.title ?? currentId;

  return (
    <div className={`cons ${tint}`}>
      <aside className="cons__side" aria-label={resolvedKind === "admin" ? "Owner console" : "Faculty console"}>
        <Link href={catalogRoute(homeId)} className="cons__brand wm">
          TutorOS <i>{resolvedKind === "admin" ? "owner" : "faculty"}</i>
        </Link>
        {items.map((it) => {
          const href = catalogRoute(it.destId);
          const on = navItemActive(it, active, currentId, pathname);
          return (
            <Link
              key={it.label}
              href={href}
              className={on ? "on" : undefined}
              aria-current={on ? "page" : undefined}
            >
              <NavIcon name={it.icon} />
              <span>{it.label}</span>
            </Link>
          );
        })}
        <div className="cons__side-foot">
          <SignOutButton />
        </div>
      </aside>
      <div className="cons__main">
        {breadcrumb ? (
          <nav className="crumb" aria-label="Breadcrumb">
            <Link href={catalogRoute(breadcrumb.parent.destId)}>{breadcrumb.parent.label}</Link>
            <span aria-hidden="true">›</span>
            <span className="crumb__here">{currentTitle}</span>
          </nav>
        ) : null}
        {children}
      </div>
    </div>
  );
}
