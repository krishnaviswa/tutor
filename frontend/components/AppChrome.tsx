"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CATALOG_SCREENS } from "@/lib/screens";

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

type NavIcon = "spark" | "cal" | "users" | "doc" | "chat" | "flag" | "cash" | "gear" | "book";

type NavItem = {
  label: string;
  destId: string;
  match: string[];
  icon: NavIcon;
};

/** Exam-prep faculty: Dashboard, Schedule, Students, Practice, Doubts, Records, Content. No staff-login. */
const FACULTY_NAV: NavItem[] = [
  { label: "Dashboard", destId: "teacher-dash", match: ["teacher-dash"], icon: "spark" },
  { label: "Schedule", destId: "schedule", match: ["schedule", "session-pre"], icon: "cal" },
  { label: "Students", destId: "roster", match: ["roster", "cohort-builder"], icon: "users" },
  { label: "Practice", destId: "qbank", match: ["qbank", "practice-build", "assign-issue", "assign-grade", "test-setup", "analysis"], icon: "doc" },
  { label: "Doubts", destId: "doubt-teacher", match: ["doubt-teacher", "messages"], icon: "chat" },
  { label: "Records", destId: "record", match: ["record", "session-video"], icon: "flag" },
  { label: "Content", destId: "library", match: ["library"], icon: "book" },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Owner console", destId: "owner", match: ["owner"], icon: "spark" },
  { label: "Billing", destId: "billing", match: ["billing"], icon: "cash" },
  { label: "Reports", destId: "reports", match: ["reports"], icon: "doc" },
  { label: "Cohorts", destId: "roster", match: ["roster"], icon: "users" },
  { label: "Schedule", destId: "schedule", match: ["schedule"], icon: "cal" },
  { label: "Records", destId: "audit", match: ["audit"], icon: "flag" },
  { label: "Integrations", destId: "integrations", match: ["integrations"], icon: "gear" },
];

function catalogRoute(id: string): string {
  const row = CATALOG_SCREENS.find((s) => s.id === id);
  if (!row) throw new Error(`unknown catalog screen id: ${id}`);
  return row.route;
}

function screenIdFromPath(pathname: string): string | undefined {
  return CATALOG_SCREENS.find((s) => s.route === pathname)?.id;
}

function Icon({ name }: { name: NavIcon }) {
  const paths: Record<NavIcon, ReactNode> = {
    spark: (
      <>
        <path d="M3 17l5-6 4 4 6-9" />
        <path d="M3 21h18" />
      </>
    ),
    cal: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" />
        <path d="M16.5 5.4a3.4 3.4 0 0 1 0 6.8M21.5 20c0-2.6-1.7-4.9-4-5.6" />
      </>
    ),
    doc: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    chat: <path d="M4 5h16v11H9l-5 4z" />,
    flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
    cash: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </>
    ),
    book: (
      <>
        <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z" />
        <path d="M19 20H8" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="16"
      height="16"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
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

  return (
    <div className={`cons ${tint}`}>
      <aside className="cons__side" aria-label={resolvedKind === "admin" ? "Owner console" : "Faculty console"}>
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
              <Icon name={it.icon} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </aside>
      <div className="cons__main">{children}</div>
    </div>
  );
}
