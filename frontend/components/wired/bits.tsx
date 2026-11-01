import Link from "next/link";
import type { ReactNode } from "react";
import { formatInr, maskIds } from "@/lib/format";

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
      <p>{maskIds(message)}</p>
    </div>
  );
}

/** FastAPI errors arrive as `400 {"detail":"..."}`. Show the sentence. */
export function apiDetail(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(raw.slice(jsonStart)) as { detail?: unknown };
      if (typeof body.detail === "string" && body.detail.trim()) return body.detail;
    } catch {
      /* keep the raw message */
    }
  }
  return raw;
}

/** Sign-in failures are sentences. The status code and JSON body stay off the page. */
export function signInError(err: unknown): string {
  const detail = apiDetail(err);
  const lower = detail.toLowerCase();
  if (lower.includes("bad otp")) {
    return "That code is not valid. Check the digits and try again.";
  }
  if (lower.includes("unknown username or password")) {
    return "Unknown username or password.";
  }
  if (lower.includes("bad challenge")) {
    return "That code expired. Enter it again.";
  }
  if (/^\d{3}\b/.test(detail) || detail.includes("{")) {
    return "Sign-in did not succeed. Check the details and try again.";
  }
  return detail;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="state state--empty" role="status">
      <p>{children}</p>
    </div>
  );
}

export function rupees(cents: number) {
  return formatInr(cents);
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
