import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { MentorScreen } from "@/components/wired/MentorScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="mentor">
        <MentorScreen />
      </AppChrome>
    </LoginGate>
  );
}
