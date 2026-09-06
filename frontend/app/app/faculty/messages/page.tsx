import { LoginGate } from "@/components/LoginGate";
import { RoleChrome } from "@/components/RoleChrome";
import { MessagesScreen } from "@/components/wired/MessagesScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate
      role="teacher"
      accept={["teacher", "owner", "assistant", "parent", "student"]}
      phone={exam.phones.teacher}
    >
      <RoleChrome screenId="messages">
        <MessagesScreen />
      </RoleChrome>
    </LoginGate>
  );
}
