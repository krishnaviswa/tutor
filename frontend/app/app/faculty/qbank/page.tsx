import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { QbankScreen } from "@/components/wired/QbankScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="qbank">
        <QbankScreen />
      </AppChrome>
    </LoginGate>
  );
}
