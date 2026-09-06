import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { PracticeBuildScreen } from "@/components/wired/PracticeBuildScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="practice-build">
        <PracticeBuildScreen />
      </AppChrome>
    </LoginGate>
  );
}
