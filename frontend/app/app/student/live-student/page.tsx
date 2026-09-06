import { Suspense } from "react";
import { LoginGate } from "@/components/LoginGate";
import { PhoneChrome } from "@/components/PhoneChrome";
import { LiveStudentScreen } from "@/components/wired/LiveStudentScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="student" phone={exam.phones.student}>
      <PhoneChrome screenId="live-student">
        <Suspense fallback={<p className="muted">Loading live…</p>}>
          <LiveStudentScreen />
        </Suspense>
      </PhoneChrome>
    </LoginGate>
  );
}
