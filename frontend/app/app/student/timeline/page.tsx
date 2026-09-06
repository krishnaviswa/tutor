import { LoginGate } from "@/components/LoginGate";
import { RoleChrome } from "@/components/RoleChrome";
import { TimelineScreen } from "@/components/wired/TimelineScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate
      role="student"
      phone={exam.phones.student}
      accept={["student", "parent", "teacher", "owner", "assistant"]}
    >
      <RoleChrome screenId="timeline">
        <TimelineScreen />
      </RoleChrome>
    </LoginGate>
  );
}
