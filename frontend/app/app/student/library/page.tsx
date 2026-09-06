import { LoginGate } from "@/components/LoginGate";
import { RoleChrome } from "@/components/RoleChrome";
import { LibraryScreen } from "@/components/wired/LibraryScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate
      role="student"
      phone={exam.phones.student}
      accept={["student", "teacher", "owner", "assistant"]}
    >
      <RoleChrome screenId="library">
        <LibraryScreen />
      </RoleChrome>
    </LoginGate>
  );
}
