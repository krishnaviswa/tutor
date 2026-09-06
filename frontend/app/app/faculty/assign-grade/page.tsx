import { Suspense } from "react";
import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { AssignGradeScreen } from "@/components/wired/AssignGradeScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="assign-grade">
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <AssignGradeScreen />
        </Suspense>
      </AppChrome>
    </LoginGate>
  );
}
