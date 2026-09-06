import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { AssignIssueScreen } from "@/components/wired/AssignIssueScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="assign-issue">
        <AssignIssueScreen />
      </AppChrome>
    </LoginGate>
  );
}
