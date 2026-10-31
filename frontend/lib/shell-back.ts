import { resolveBreadcrumb, type NavItem } from "@/lib/nav";
import { catalogRoute } from "@/lib/screens";

const TRAIL_KEY = "tutor.shell.trail";
const REVEAL_KEY = "tutor.shell.reveal";
const MAX_TRAIL = 40;

export type ShellBackTarget = { href: string; via: "parent" | "history" };

let memoryTrail: string[] = [];
let memoryReveal = false;
let referrerSeeded = false;

/** App routes live under /app. Anything else, including an external origin, is refused. */
export function isInAppPath(path: string): boolean {
  if (typeof path !== "string") return false;
  const clean = path.split(/[?#]/)[0].trim();
  if (clean !== "/app" && !clean.startsWith("/app/")) return false;
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    return false;
  }
  if (decoded.includes("..") || decoded.includes("\\") || decoded.includes("://")) return false;
  return true;
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readTrail(): string[] {
  const store = storage();
  if (!store) return memoryTrail.slice();
  try {
    const raw = store.getItem(TRAIL_KEY);
    if (!raw) return memoryTrail.slice();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return memoryTrail.slice();
    return parsed.filter((item): item is string => typeof item === "string" && isInAppPath(item));
  } catch {
    return memoryTrail.slice();
  }
}

function writeTrail(trail: string[]) {
  const next = trail.filter(isInAppPath).slice(-MAX_TRAIL);
  memoryTrail = next;
  const store = storage();
  if (!store) return;
  try {
    store.setItem(TRAIL_KEY, JSON.stringify(next));
  } catch {
    /* quota or private mode — memory trail still works for this tab */
  }
}

function pathFromReferrer(referrer: string, current: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(referrer);
    if (url.origin !== window.location.origin) return null;
    const path = url.pathname;
    if (!isInAppPath(path) || path === current) return null;
    return path;
  } catch {
    return null;
  }
}

/** Remember this visit. A same-origin /app referrer seeds the stack once per page load. */
export function recordVisit(pathname: string, referrer?: string): void {
  if (!isInAppPath(pathname)) return;
  let trail = readTrail();
  if (!referrerSeeded) {
    referrerSeeded = true;
    if (trail.length === 0 && referrer) {
      const seeded = pathFromReferrer(referrer, pathname);
      if (seeded) trail = [seeded];
    }
  }
  if (trail[trail.length - 1] === pathname) {
    writeTrail(trail);
    return;
  }
  if (trail.length >= 2 && trail[trail.length - 2] === pathname) {
    trail.pop();
    writeTrail(trail);
    return;
  }
  trail.push(pathname);
  writeTrail(trail);
}

export function previousInApp(pathname: string): string | null {
  const trail = readTrail();
  const prev = trail[trail.length - 1] === pathname ? trail[trail.length - 2] : trail[trail.length - 1];
  if (!prev || prev === pathname || !isInAppPath(prev)) return null;
  return prev;
}

/** Drop the current screen before leaving, and mark the next screen to reveal. */
export function markShellBack(pathname: string): void {
  const trail = readTrail();
  if (trail[trail.length - 1] === pathname) {
    trail.pop();
    writeTrail(trail);
  }
  memoryReveal = true;
  const store = storage();
  try {
    store?.setItem(REVEAL_KEY, "1");
  } catch {
    /* memory flag still reveals this navigation */
  }
}

export function takeShellReveal(): boolean {
  const fromMemory = memoryReveal;
  memoryReveal = false;
  let fromStore = false;
  const store = storage();
  try {
    fromStore = store?.getItem(REVEAL_KEY) === "1";
    if (fromStore) store?.removeItem(REVEAL_KEY);
  } catch {
    /* ignore */
  }
  return fromMemory || fromStore;
}

export function isNavDestination(items: NavItem[], currentId?: string): boolean {
  if (!currentId) return false;
  return items.some((item) => item.destId === currentId);
}

/**
 * Nested screens prefer the breadcrumb parent.
 * A nav item's own destination hides the arrow.
 * Any other screen may step back to the previous in-app route.
 */
export function resolveShellBack(
  items: NavItem[],
  currentId: string | undefined,
  pathname: string,
  previous: string | null,
): ShellBackTarget | null {
  const crumb = resolveBreadcrumb(items, currentId);
  if (crumb) {
    const href = catalogRoute(crumb.parent.destId);
    if (!isInAppPath(href) || href === pathname) return null;
    return { href, via: "parent" };
  }
  if (isNavDestination(items, currentId)) return null;
  if (previous && isInAppPath(previous) && previous !== pathname) {
    return { href: previous, via: "history" };
  }
  return null;
}
