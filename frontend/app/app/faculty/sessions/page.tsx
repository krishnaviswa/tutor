import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { SessionsScreen } from "@/components/wired/SessionsScreen";

export default function Page() {
  return (
    <LoginGate role="teacher" accept={["teacher", "owner", "assistant"]}>
      <AppChrome active="Schedule" kind="faculty" screenId="sessions">
        <SessionsScreen />
      </AppChrome>
    </LoginGate>
  );
}
