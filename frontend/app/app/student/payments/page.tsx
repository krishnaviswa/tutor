import { LoginGate } from "@/components/LoginGate";
import { RoleChrome } from "@/components/RoleChrome";
import { PaymentsScreen } from "@/components/wired/PaymentsScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="student" phone={exam.phones.student} accept={["student", "parent"]}>
      <RoleChrome screenId="payments">
        <PaymentsScreen />
      </RoleChrome>
    </LoginGate>
  );
}
