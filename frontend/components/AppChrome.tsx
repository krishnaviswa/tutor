"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { NavIcon } from "@/components/NavIcon";
import { BrandLockup } from "@/components/SignedInMark";
import { SectionTabs } from "@/components/SectionTabs";
import { ShellBack, ShellStage } from "@/components/ShellBack";
import { ShellControls } from "@/components/ShellControls";
import { ADMIN_NAV, FACULTY_NAV, resolveBreadcrumb, type NavItem } from "@/lib/nav";
import { CATALOG_SCREENS, catalogRoute } from "@/lib/screens";
import { clearToken } from "@/lib/session";

function SignOutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

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
  const [modules, setModules] = useState<string[] | null>(null);
  useEffect(() => {
    if (resolvedKind !== "faculty") return;
    let stop = false;
    api("/api/v1/auth/me")
      .then((me) => {
        if (stop) return;
        const list = (me as { permissions?: string[] | null }).permissions;
        setModules(Array.isArray(list) ? list : null);
      })
      .catch(() => {
        if (!stop) setModules(null);
      });
    return () => {
      stop = true;
    };
  }, [resolvedKind]);
  const facultyItems = modules
    ? FACULTY_NAV.filter((item) => !item.module || modules.includes(item.module))
    : FACULTY_NAV;
  const items = resolvedKind === "admin" ? ADMIN_NAV : facultyItems;
  const currentId = screenId ?? screenIdFromPath(pathname);
  const homeId = resolvedKind === "admin" ? "owner" : "teacher-dash";
  const breadcrumb = resolveBreadcrumb(items, currentId);
  const currentTitle = CATALOG_SCREENS.find((s) => s.id === currentId)?.title ?? currentId;

  return (
    <div className="cons">
      <aside className="cons__side" aria-label={resolvedKind === "admin" ? "Owner console" : "Faculty console"}>
        <BrandLockup
          href={catalogRoute(homeId)}
          mark={resolvedKind === "admin" ? "owner" : "faculty"}
          className="cons__brand"
        />
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
      </aside>
      <div className="cons__main">
        <div className="shell-head">
          <ShellBack items={items} currentId={currentId} />
          <p className="place">
            <span>{resolvedKind === "admin" ? "Owner" : "Faculty"}</span>
            <strong>{currentTitle}</strong>
          </p>
          <ShellControls />
          <button
            type="button"
            className="theme-btn signout"
            onClick={() => {
              clearToken();
              window.location.assign(catalogRoute("router"));
            }}
          >
            <SignOutIcon />
            <span>Sign out</span>
          </button>
        </div>
        {breadcrumb ? (
          <nav className="crumb" aria-label="Breadcrumb">
            <Link href={catalogRoute(breadcrumb.parent.destId)}>{breadcrumb.parent.label}</Link>
            <span aria-hidden="true">›</span>
            <span className="crumb__here">{currentTitle}</span>
          </nav>
        ) : null}
        <SectionTabs screenId={currentId} role={resolvedKind} />
        <ShellStage>{children}</ShellStage>
      </div>
    </div>
  );
}
