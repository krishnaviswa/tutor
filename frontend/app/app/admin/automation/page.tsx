import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { AutomationScreen } from "@/components/wired/AutomationScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="owner" phone={exam.phones.owner}>
      <AppChrome kind="admin" screenId="automation">
        <AutomationScreen />
      </AppChrome>
    </LoginGate>
  );
}
