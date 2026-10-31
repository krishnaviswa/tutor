"use client";

import { useEffect, useState } from "react";
import { persistTheme, readStoredTheme, type ThemeName } from "@/lib/theme";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 6.2 6.2 0 1 0 20 14.5z" />
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>("light");

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  function toggle() {
    const next: ThemeName = theme === "dark" ? "light" : "dark";
    persistTheme(next);
    setTheme(next);
  }

  const nextLabel = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="theme-btn shell-icon-btn" onClick={toggle} aria-label={`Switch to ${nextLabel} theme`}>
      {theme === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
