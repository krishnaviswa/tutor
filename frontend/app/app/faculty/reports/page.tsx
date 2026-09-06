import { LoginGate } from "@/components/LoginGate";
import { RoleChrome } from "@/components/RoleChrome";
import { ReportsScreen } from "@/components/wired/ReportsScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="teacher" accept={["teacher", "owner", "parent"]} phone={exam.phones.teacher}>
      <RoleChrome screenId="reports">
        <ReportsScreen />
      </RoleChrome>
    </LoginGate>
  );
}
