import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { AvailabilityScreen } from "@/components/wired/AvailabilityScreen";

export default function Page() {
  return (
    <LoginGate role="teacher" accept={["teacher", "owner", "assistant"]}>
      <AppChrome active="Availability" kind="faculty" screenId="availability">
        <AvailabilityScreen />
      </AppChrome>
    </LoginGate>
  );
}
