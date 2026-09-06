import { Suspense } from "react";
import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { LiveTeacherScreen } from "@/components/wired/LiveTeacherScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="live-teacher">
        <Suspense fallback={<p className="muted">Loading live…</p>}>
          <LiveTeacherScreen />
        </Suspense>
      </AppChrome>
    </LoginGate>
  );
}
