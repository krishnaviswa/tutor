import { LoginGate } from "@/components/LoginGate";
import { RoleChrome } from "@/components/RoleChrome";
import { RosterScreen } from "@/components/wired/RosterScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate
      role="teacher"
      phone={exam.phones.teacher}
      accept={["teacher", "owner", "assistant"]}
    >
      <RoleChrome screenId="roster">
        <RosterScreen />
      </RoleChrome>
    </LoginGate>
  );
}
