import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { DoubtTeacherScreen } from "@/components/wired/DoubtTeacherScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="doubt-teacher">
        <DoubtTeacherScreen />
      </AppChrome>
    </LoginGate>
  );
}
