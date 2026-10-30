import Link from "next/link";
import type { ReactNode } from "react";

export function AppBar({ title, extra }: { title: string; extra?: ReactNode }) {
  return (
    <header className="appbar">
      <h2>{title}</h2>
      {extra}
    </header>
  );
}

export function Loading({ children = "Loading…" }: { children?: ReactNode }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite" aria-busy="true">
      <span className="state__spin" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function Err({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="state state--error" role="alert">
      <p>{message}</p>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="state state--empty" role="status">
      <p>{children}</p>
    </div>
  );
}

export function rupees(cents: number) {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Av({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`av av--sm ${className}`.trim()} style={{ background: "var(--tint)" }}>
      {initials(name)}
    </span>
  );
}

export function CatalogLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
