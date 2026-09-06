import { LoginGate } from "@/components/LoginGate";
import { SetupChrome } from "@/components/SetupChrome";
import { BrandingScreen } from "@/components/wired/BrandingScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="owner" phone={exam.phones.owner}>
      <SetupChrome stepId="branding">
        <BrandingScreen />
      </SetupChrome>
    </LoginGate>
  );
}
