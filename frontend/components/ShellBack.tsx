"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { NavItem } from "@/lib/nav";
import { markShellBack, previousInApp, recordVisit, resolveShellBack, takeShellReveal } from "@/lib/shell-back";

const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

function dialogIsOpen(): boolean {
  return typeof document !== "undefined" && document.querySelector("[role='dialog'][aria-modal='true']") != null;
}

function BackGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H6" />
      <path d="M11 6 5 12l6 6" />
    </svg>
  );
}

export function ShellBack({ items, currentId }: { items: NavItem[]; currentId?: string }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    recordVisit(pathname, document.referrer);
    setPrevious(previousInApp(pathname));
  }, [pathname]);

  const target = resolveShellBack(items, currentId, pathname, previous);
  if (!target) return null;
  const href = target.href;

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
    if (dialogIsOpen()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    markShellBack(pathname);
    router.push(href);
  }

  return (
    <Link href={href} className="shell-back" aria-label="Back" onClick={onClick}>
      <BackGlyph />
    </Link>
  );
}

/** Screen body. Slides in only after the shell back control, and only when motion is allowed. */
export function ShellStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayout(() => {
    const el = ref.current;
    if (!el || !takeShellReveal()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("shell-stage--reveal");
  }, []);

  return (
    <div ref={ref} className="shell-stage">
      {children}
    </div>
  );
}
