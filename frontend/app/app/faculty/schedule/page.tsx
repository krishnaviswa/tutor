import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { ScheduleScreen } from "@/components/wired/ScheduleScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome active="Schedule" kind="faculty">
        <ScheduleScreen />
      </AppChrome>
    </LoginGate>
  );
}
