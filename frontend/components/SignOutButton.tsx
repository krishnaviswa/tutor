"use client";

import { clearToken } from "@/lib/session";
import { catalogRoute } from "@/lib/screens";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className ?? "signout"}
      onClick={() => {
        // Wait until the httpOnly cookie is cleared, then leave. A hard
        // navigation drops the signed-in page so Back does not restore it.
        void clearToken().then(() => {
          window.location.assign(catalogRoute("router"));
        });
      }}
    >
      Sign out
    </button>
  );
}
