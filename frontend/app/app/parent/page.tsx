import { LoginGate } from "@/components/LoginGate";
import { ParentChrome } from "@/components/ParentChrome";
import { ParentHomeScreen } from "@/components/wired/ParentHomeScreen";
import { MOCK_TENANTS } from "@/lib/mocks";

const exam = MOCK_TENANTS["exam-prep"];

export default function Page() {
  return (
    <LoginGate role="parent" phone={exam.phones.parent}>
      <ParentChrome screenId="parent-home">
        <ParentHomeScreen />
      </ParentChrome>
    </LoginGate>
  );
}
