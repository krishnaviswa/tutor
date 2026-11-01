"use client";

import Link from "next/link";
import { catalogRoute } from "@/lib/screens";

export type SectionTabRole = "faculty" | "admin" | "student" | "parent";

export type SectionTabItem = {
  id: string;
  label: string;
};

export type SectionTabGroup = {
  key: string;
  groupLabel: string;
  roles: SectionTabRole[];
  tabs: SectionTabItem[];
};

export const SECTION_TAB_GROUPS: SectionTabGroup[] = [
  {
    key: "faculty-schedule",
    groupLabel: "Schedule",
    roles: ["faculty", "admin"],
    tabs: [
      { id: "schedule", label: "Week Calendar" },
      { id: "sessions", label: "Sessions & Supervision" },
      { id: "session-pre", label: "Pre-Class Prep" },
      { id: "availability", label: "My Availability" },
    ],
  },
  {
    key: "faculty-students",
    groupLabel: "Students",
    roles: ["faculty", "admin"],
    tabs: [
      { id: "roster", label: "Student Roster" },
      { id: "cohort-builder", label: "Cohorts & Batches" },
      { id: "mentor", label: "Mentor Backlog" },
    ],
  },
  {
    key: "faculty-practice",
    groupLabel: "Practice & Assessments",
    roles: ["faculty", "admin"],
    tabs: [
      { id: "qbank", label: "1. Question Bank" },
      { id: "practice-build", label: "2. Practice Builder" },
      { id: "assign-issue", label: "3. Issue Homework" },
      { id: "assign-grade", label: "4. Grade Work" },
      { id: "test-setup", label: "5. Mock Tests" },
      { id: "analysis", label: "6. Cohort Analysis" },
    ],
  },
  {
    key: "faculty-doubts",
    groupLabel: "Doubts & Comms",
    roles: ["faculty", "admin"],
    tabs: [
      { id: "doubt-teacher", label: "Doubts Queue" },
      { id: "messages", label: "Direct Messages" },
      { id: "announce", label: "Announcements" },
    ],
  },
  {
    key: "faculty-records",
    groupLabel: "Records & Reports",
    roles: ["faculty", "admin"],
    tabs: [
      { id: "record", label: "Class Record & Roll" },
      { id: "session-video", label: "Session Recordings" },
      { id: "reports", label: "Progress Reports" },
    ],
  },
  {
    key: "owner-console",
    groupLabel: "Owner Console",
    roles: ["admin", "faculty"],
    tabs: [
      { id: "owner", label: "Scorecard & Enquiries" },
      { id: "payouts", label: "Teacher Payouts" },
      { id: "subscription", label: "Subscription & Quotas" },
      { id: "automation", label: "Automations" },
      { id: "template-gallery", label: "Templates" },
      { id: "branding", label: "Branding" },
      { id: "wsetup", label: "Workspace Setup" },
    ],
  },
  {
    key: "student-classes",
    groupLabel: "Classes",
    roles: ["student"],
    tabs: [
      { id: "library", label: "Study Library" },
      { id: "lesson", label: "Lesson View" },
      { id: "join", label: "Join Class" },
      { id: "live-student", label: "Live Whiteboard" },
    ],
  },
  {
    key: "student-practice",
    groupLabel: "Practice",
    roles: ["student"],
    tabs: [
      { id: "practice-play", label: "Practice Sets" },
      { id: "test-runner", label: "Mock Tests" },
      { id: "practice-result", label: "My Results" },
    ],
  },
  {
    key: "student-account",
    groupLabel: "You",
    roles: ["student"],
    tabs: [
      { id: "timeline", label: "Activity Timeline" },
      { id: "payments", label: "Fees & Packs" },
      { id: "notif-prefs", label: "Alerts" },
      { id: "profile", label: "My Profile" },
    ],
  },
  {
    key: "parent-home",
    groupLabel: "Home",
    roles: ["parent"],
    tabs: [
      { id: "parent-home", label: "Family Overview" },
      { id: "notif-prefs", label: "Alert Preferences" },
    ],
  },
  {
    key: "parent-reports",
    groupLabel: "Reports",
    roles: ["parent"],
    tabs: [
      { id: "reports", label: "Progress Report" },
      { id: "practice-result", label: "Test Results" },
    ],
  },
];

export function resolveSectionTabGroup(
  screenId?: string,
  role?: SectionTabRole,
): SectionTabGroup | null {
  if (!screenId) return null;
  if (role) {
    const roleMatch = SECTION_TAB_GROUPS.find(
      (g) => g.roles.includes(role) && g.tabs.some((t) => t.id === screenId),
    );
    if (roleMatch) return roleMatch;
    return null;
  }
  return SECTION_TAB_GROUPS.find((g) => g.tabs.some((t) => t.id === screenId)) ?? null;
}

export type SectionTabsProps = {
  screenId?: string;
  role?: SectionTabRole;
};

export function SectionTabs({ screenId, role }: SectionTabsProps) {
  const group = resolveSectionTabGroup(screenId, role);
  if (!group) return null;

  return (
    <nav className="section-tabs" aria-label={`${group.groupLabel} workflow navigation`}>
      {group.tabs.map((tab) => {
        const active = tab.id === screenId;
        return (
          <Link
            key={tab.id}
            href={catalogRoute(tab.id)}
            className={`section-tabs__tab${active ? " on is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
