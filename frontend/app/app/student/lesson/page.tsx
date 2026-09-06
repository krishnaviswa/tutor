import { Suspense } from "react";
import { LoginGate } from "@/components/LoginGate";
import { PhoneChrome } from "@/components/PhoneChrome";
import { LessonScreen } from "@/components/wired/LessonScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="student" phone={exam.phones.student} accept={["student", "teacher", "owner", "assistant"]}>
      <PhoneChrome screenId="lesson">
        <Suspense fallback={<p className="muted">Loading lesson…</p>}>
          <LessonScreen />
        </Suspense>
      </PhoneChrome>
    </LoginGate>
  );
}
