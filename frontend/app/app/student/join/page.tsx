import { Suspense } from "react";
import { LoginGate } from "@/components/LoginGate";
import { PhoneChrome } from "@/components/PhoneChrome";
import { JoinScreen } from "@/components/wired/JoinScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="student" phone={exam.phones.student}>
      <PhoneChrome screenId="join">
        <Suspense fallback={<p className="muted">Loading join…</p>}>
          <JoinScreen />
        </Suspense>
      </PhoneChrome>
    </LoginGate>
  );
}
