import { Suspense } from "react";
import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { SessionPreScreen } from "@/components/wired/SessionPreScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome active="Schedule" kind="faculty">
        <Suspense fallback={<p className="muted">Loading session…</p>}>
          <SessionPreScreen />
        </Suspense>
      </AppChrome>
    </LoginGate>
  );
}
