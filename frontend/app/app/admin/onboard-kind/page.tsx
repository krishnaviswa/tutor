import { LoginGate } from "@/components/LoginGate";
import { SetupChrome } from "@/components/SetupChrome";
import { OnboardKindScreen } from "@/components/wired/OnboardKindScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="owner" phone={exam.phones.owner}>
      <SetupChrome stepId="onboard-kind">
        <OnboardKindScreen />
      </SetupChrome>
    </LoginGate>
  );
}
