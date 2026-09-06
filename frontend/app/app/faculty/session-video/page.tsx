import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { SessionVideoScreen } from "@/components/wired/SessionVideoScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="session-video">
        <SessionVideoScreen />
      </AppChrome>
    </LoginGate>
  );
}
