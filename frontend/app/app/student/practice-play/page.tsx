import { LoginGate } from "@/components/LoginGate";
import { PhoneChrome } from "@/components/PhoneChrome";
import { PracticePlayScreen } from "@/components/wired/PracticePlayScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="student" phone={exam.phones.student}>
      <PhoneChrome screenId="practice-play">
        <PracticePlayScreen />
      </PhoneChrome>
    </LoginGate>
  );
}
