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

/** Demo parent `pnav`: Home, Activity, Reports, Fees, Chat. */
const PARENT_NAV: NavItem[] = [
  { label: "Home", destId: "parent-home", match: ["parent-home", "notif-prefs"], icon: "home" },
  { label: "Activity", destId: "timeline", match: ["timeline"], icon: "flag" },
  { label: "Reports", destId: "reports", match: ["reports", "practice-result"], icon: "doc" },
  { label: "Fees", destId: "payments", match: ["payments"], icon: "cash" },
  { label: "Chat", destId: "messages", match: ["messages"], icon: "chat" },
];

export type ParentChromeProps = {
  screenId?: string;
  active?: string;
  children: ReactNode;
};

function screenIdFromPath(pathname: string): string | undefined {
  return CATALOG_SCREENS.find((s) => s.route === pathname)?.id;
}

export function ParentChrome({ screenId, active, children }: ParentChromeProps) {
  const pathname = usePathname();
  const currentId = screenId ?? screenIdFromPath(pathname);

  return (
    <div className="phone tint-violet">
      <div className="phonewrap">
        <div className="phonewrap__body">{children}</div>
        <nav className="appnav pnav" aria-label="Parent app">
          {PARENT_NAV.map((it) => {
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
