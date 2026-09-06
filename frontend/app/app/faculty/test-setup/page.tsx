import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { TestSetupScreen } from "@/components/wired/TestSetupScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="test-setup">
        <TestSetupScreen />
      </AppChrome>
    </LoginGate>
  );
}
