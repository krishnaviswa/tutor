import { Suspense } from "react";
import { LoginGate } from "@/components/LoginGate";
import { RoleChrome } from "@/components/RoleChrome";
import { PracticeResultScreen } from "@/components/wired/PracticeResultScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="student" phone={exam.phones.student} accept={["student", "parent", "teacher", "owner"]}>
      <RoleChrome screenId="practice-result">
        <Suspense fallback={<p className="muted">Loading result…</p>}>
          <PracticeResultScreen />
        </Suspense>
      </RoleChrome>
    </LoginGate>
  );
}
