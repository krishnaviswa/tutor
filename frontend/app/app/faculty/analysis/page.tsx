import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { AnalysisScreen } from "@/components/wired/AnalysisScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="analysis">
        <AnalysisScreen />
      </AppChrome>
    </LoginGate>
  );
}
