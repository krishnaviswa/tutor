import { LoginGate } from "@/components/LoginGate";
import { RoleChrome } from "@/components/RoleChrome";
import { NotifPrefsScreen } from "@/components/wired/NotifPrefsScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="student" phone={exam.phones.student} accept={["student", "parent", "teacher", "owner"]}>
      <RoleChrome screenId="notif-prefs">
        <NotifPrefsScreen />
      </RoleChrome>
    </LoginGate>
  );
}
