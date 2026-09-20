"use client";

import { clearToken } from "@/lib/session";
import { catalogRoute } from "@/lib/screens";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className ?? "signout"}
      onClick={() => {
        clearToken();
        // Full document navigation, not router.push: there is no server
        // session to invalidate (stateless JWT in localStorage), and
        // RoleChrome swallows /auth/me errors by defaulting to role
        // "student" instead of redirecting. A hard nav guarantees no
        // stale chrome/page state survives sign-out.
        window.location.assign(catalogRoute("router"));
      }}
    >
      Sign out
    </button>
  );
}
