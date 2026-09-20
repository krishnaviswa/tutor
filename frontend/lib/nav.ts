import type { NavIconName } from "@/components/NavIcon";

export type NavItem = {
  label: string;
  destId: string;
  match: string[];
  icon: NavIconName;
};

/** Exam-prep faculty: Dashboard, Schedule, Students, Practice, Doubts, Records, Content. No staff-login. */
export const FACULTY_NAV: NavItem[] = [
  { label: "Dashboard", destId: "teacher-dash", match: ["teacher-dash"], icon: "spark" },
  { label: "Schedule", destId: "schedule", match: ["schedule", "session-pre", "sessions"], icon: "cal" },
  { label: "Availability", destId: "availability", match: ["availability"], icon: "clock" },
  { label: "Students", destId: "roster", match: ["roster", "cohort-builder"], icon: "users" },
  { label: "Practice", destId: "qbank", match: ["qbank", "practice-build", "assign-issue", "assign-grade", "test-setup", "analysis"], icon: "doc" },
  { label: "Doubts", destId: "doubt-teacher", match: ["doubt-teacher", "messages"], icon: "chat" },
  { label: "Records", destId: "record", match: ["record", "session-video"], icon: "flag" },
  { label: "Content", destId: "library", match: ["library"], icon: "book" },
];

/**
 * subscription/template-gallery/automation aren't destinations of their own
 * nav item, but they're reachable admin sub-screens (subscription is linked
 * from OwnerScreen) — bucket them under Owner console so the breadcrumb
 * helper always has a parent to resolve to.
 */
export const ADMIN_NAV: NavItem[] = [
  { label: "Owner console", destId: "owner", match: ["owner", "subscription", "template-gallery", "automation"], icon: "spark" },
  { label: "Billing", destId: "billing", match: ["billing"], icon: "cash" },
  { label: "Reports", destId: "reports", match: ["reports"], icon: "doc" },
  { label: "Cohorts", destId: "roster", match: ["roster"], icon: "users" },
  { label: "Schedule", destId: "schedule", match: ["schedule", "sessions", "availability"], icon: "cal" },
  { label: "Records", destId: "audit", match: ["audit"], icon: "flag" },
  { label: "Integrations", destId: "integrations", match: ["integrations"], icon: "gear" },
];

/** Demo student `appnav`: Home, Classes, Practice, Doubts, You. */
export const STUDENT_NAV: NavItem[] = [
  { label: "Home", destId: "student-dash", match: ["student-dash"], icon: "home" },
  { label: "Classes", destId: "library", match: ["library", "lesson", "join", "live-student"], icon: "play" },
  { label: "Practice", destId: "practice-play", match: ["practice-play", "practice-result", "test-runner"], icon: "spark" },
  { label: "Doubts", destId: "doubt-student", match: ["doubt-student"], icon: "chat" },
  { label: "You", destId: "timeline", match: ["timeline", "notif-prefs", "payments"], icon: "flag" },
];

/** Demo parent `pnav`: Home, Activity, Reports, Fees, Chat. */
export const PARENT_NAV: NavItem[] = [
  { label: "Home", destId: "parent-home", match: ["parent-home", "notif-prefs"], icon: "home" },
  { label: "Activity", destId: "timeline", match: ["timeline"], icon: "flag" },
  { label: "Reports", destId: "reports", match: ["reports", "practice-result"], icon: "doc" },
  { label: "Fees", destId: "payments", match: ["payments"], icon: "cash" },
  { label: "Chat", destId: "messages", match: ["messages"], icon: "chat" },
];

/**
 * Resolves the nav item that "owns" a screen id and whether that screen is a
 * child reached in-page (not the item's own destination) — the case where a
 * breadcrumb is needed because the sidebar/tab bar alone doesn't say where
 * the user actually is.
 */
export function resolveBreadcrumb(items: NavItem[], currentId?: string): { parent: NavItem } | null {
  if (!currentId) return null;
  const parent = items.find((it) => it.match.includes(currentId));
  if (!parent || parent.destId === currentId) return null;
  return { parent };
}
