export const THEME_KEY = "tos_theme";
export const LEGACY_BW_KEY = "tos_bw";

/** Inline <head> script — apply stored light/dark before first paint. */
export const THEME_BOOT =
  '(function(){try{var t=localStorage.getItem("tos_theme");if(t!=="dark"&&t!=="light")t=localStorage.getItem("tos_bw")==="black"?"dark":"light";document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){}})();';

export type ThemeName = "light" | "dark";

export function readStoredTheme(): ThemeName {
  try {
    const next = localStorage.getItem(THEME_KEY);
    if (next === "dark" || next === "light") return next;
    if (localStorage.getItem(LEGACY_BW_KEY) === "black") return "dark";
  } catch {
    /* private mode */
  }
  return "light";
}

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

export function persistTheme(theme: ThemeName) {
  try {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.removeItem(LEGACY_BW_KEY);
  } catch {
    /* private mode */
  }
  applyTheme(theme);
}
