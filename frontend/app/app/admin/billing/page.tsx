import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { BillingScreen } from "@/components/wired/BillingScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="owner" phone={exam.phones.owner}>
      <AppChrome kind="admin" screenId="billing">
        <BillingScreen />
      </AppChrome>
    </LoginGate>
  );
}
