import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { RecordScreen } from "@/components/wired/RecordScreen";

export default function Page() {
  return (
    <LoginGate role="teacher" accept={["teacher", "owner"]}>
      <AppChrome active="Records" role="faculty">
        <RecordScreen />
      </AppChrome>
    </LoginGate>
  );
}
