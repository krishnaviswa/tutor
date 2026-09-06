"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavIcon, type NavIconName } from "@/components/NavIcon";
import { catalogRoute, CATALOG_SCREENS } from "@/lib/screens";

type NavItem = {
  label: string;
  destId: string;
  match: string[];
  icon: NavIconName;
};

/** Demo student `appnav`: Home, Classes, Practice, Doubts, You. */
const STUDENT_NAV: NavItem[] = [
  { label: "Home", destId: "student-dash", match: ["student-dash"], icon: "home" },
  { label: "Classes", destId: "library", match: ["library", "lesson", "join", "live-student"], icon: "play" },
  { label: "Practice", destId: "practice-play", match: ["practice-play", "practice-result", "test-runner"], icon: "spark" },
  { label: "Doubts", destId: "doubt-student", match: ["doubt-student"], icon: "chat" },
  { label: "You", destId: "timeline", match: ["timeline", "notif-prefs", "payments"], icon: "flag" },
];

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

  return (
    <div className="phone tint-accent">
      <div className="phonewrap">
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
