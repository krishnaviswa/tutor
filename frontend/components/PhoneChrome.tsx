"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavIcon } from "@/components/NavIcon";
import { SignOutButton } from "@/components/SignOutButton";
import { STUDENT_NAV, resolveBreadcrumb } from "@/lib/nav";
import { CATALOG_SCREENS, catalogRoute } from "@/lib/screens";

export type PhoneChromeProps = {
  screenId?: string;
  active?: string;
  children: ReactNode;
};

function screenIdFromPath(pathname: string): string | undefined {
  return CATALOG_SCREENS.find((s) => s.route === pathname)?.id;
}

export function PhoneChrome({ screenId, active, children }: PhoneChromeProps) {
  const pathname = usePathname();
  const currentId = screenId ?? screenIdFromPath(pathname);
  const breadcrumb = resolveBreadcrumb(STUDENT_NAV, currentId);
  const currentTitle = CATALOG_SCREENS.find((s) => s.id === currentId)?.title ?? currentId;

  return (
    <div className="phone tint-accent">
      <div className="phonewrap">
        <header className="crumbstrip">
          <Link href={catalogRoute("student-dash")} className="wm wm--sm">
            TutorOS
          </Link>
          {breadcrumb ? (
            <nav className="crumb" aria-label="Breadcrumb">
              <Link href={catalogRoute(breadcrumb.parent.destId)}>{breadcrumb.parent.label}</Link>
              <span aria-hidden="true">›</span>
              <span className="crumb__here">{currentTitle}</span>
            </nav>
          ) : null}
          <SignOutButton className="signout signout--sm" />
        </header>
        <div className="phonewrap__body">{children}</div>
        <nav className="appnav" aria-label="Student app">
          {STUDENT_NAV.map((it) => {
            const on = active ? it.label === active : Boolean(currentId && it.match.includes(currentId));
            return (
              <Link
                key={it.label}
                href={catalogRoute(it.destId)}
                className={on ? "on" : undefined}
                aria-current={on ? "page" : undefined}
              >
                <NavIcon name={it.icon} />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
