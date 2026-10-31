"use client";

import { useEffect, type ReactNode } from "react";
import { CampusAtmosphere } from "@/components/CampusAtmosphere";
import { applyTheme, readStoredTheme } from "@/lib/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyTheme(readStoredTheme());
    function onStorage(ev: StorageEvent) {
      if (ev.key === "tos_theme" || ev.key === "tos_bw") applyTheme(readStoredTheme());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return (
    <>
      <CampusAtmosphere />
      {children}
    </>
  );
}
