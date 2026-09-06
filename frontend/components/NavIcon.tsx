import type { ReactNode } from "react";

export type NavIconName =
  | "home"
  | "play"
  | "spark"
  | "chat"
  | "flag"
  | "doc"
  | "cash"
  | "cal"
  | "users"
  | "book"
  | "gear";

const PATHS: Record<NavIconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5V21H4a1 1 0 0 1-1-1z" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5z" />
    </>
  ),
  spark: (
    <>
      <path d="M3 17l5-6 4 4 6-9" />
      <path d="M3 21h18" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  doc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  cash: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
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
  book: (
    <>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z" />
      <path d="M19 20H8" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
};

export function NavIcon({ name }: { name: NavIconName }) {
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
      {PATHS[name]}
    </svg>
  );
}
