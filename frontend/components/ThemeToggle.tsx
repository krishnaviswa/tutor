"use client";

import { useEffect, useState } from "react";
import { persistTheme, readStoredTheme, type ThemeName } from "@/lib/theme";

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

  const nextLabel = theme === "dark" ? "Light" : "Dark";
  return (
    <button
      type="button"
      className="theme-btn"
      onClick={toggle}
      aria-label={`Switch to ${nextLabel.toLowerCase()} theme`}
    >
      {nextLabel}
    </button>
  );
}
