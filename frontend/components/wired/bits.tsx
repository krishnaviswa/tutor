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

export function Err({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="muted" style={{ color: "var(--crimson)", marginBottom: 12 }}>
      {message}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
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
