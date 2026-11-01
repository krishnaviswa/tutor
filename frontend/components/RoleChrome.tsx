"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AppChrome } from "@/components/AppChrome";
import { ParentChrome } from "@/components/ParentChrome";
import { PhoneChrome } from "@/components/PhoneChrome";
import { Loading } from "@/components/wired/bits";
import { api } from "@/lib/api";

export type RoleChromeProps = {
  screenId: string;
  children: ReactNode;
};

/** Pick demo chrome from the signed-in JWT role. Used on dual-role catalog ids. */
export function RoleChrome({ screenId, children }: RoleChromeProps) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api("/api/v1/auth/me")
      .then((me) => {
        if (!cancelled) setRole((me as { role?: string }).role || "signed-out");
      })
      .catch(() => {
        if (!cancelled) setRole("signed-out");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!role) {
    return (
      <div className="login-gate">
        <Loading>Checking your account…</Loading>
      </div>
    );
  }
  if (role === "signed-out") {
    return (
      <div className="login-gate">
        <h2>Sign in</h2>
        <p className="muted">Sign in to continue.</p>
      </div>
    );
  }
  if (role === "parent") return <ParentChrome screenId={screenId}>{children}</ParentChrome>;
  if (role === "student") return <PhoneChrome screenId={screenId}>{children}</PhoneChrome>;
  if (role === "owner") return <AppChrome kind="admin" screenId={screenId}>{children}</AppChrome>;
  return <AppChrome kind="faculty" screenId={screenId}>{children}</AppChrome>;
}
