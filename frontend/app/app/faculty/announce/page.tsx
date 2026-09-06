import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { AnnounceScreen } from "@/components/wired/AnnounceScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="announce">
        <AnnounceScreen />
      </AppChrome>
    </LoginGate>
  );
}
