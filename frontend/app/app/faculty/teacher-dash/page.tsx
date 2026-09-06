import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { TeacherDashScreen } from "@/components/wired/TeacherDashScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="teacher-dash">
        <TeacherDashScreen />
      </AppChrome>
    </LoginGate>
  );
}
