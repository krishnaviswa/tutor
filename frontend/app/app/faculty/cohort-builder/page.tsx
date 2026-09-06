import { AppChrome } from "@/components/AppChrome";
import { LoginGate } from "@/components/LoginGate";
import { CohortBuilderScreen } from "@/components/wired/CohortBuilderScreen";

export default function Page() {
  return (
    <LoginGate role="teacher">
      <AppChrome kind="faculty" screenId="cohort-builder">
        <CohortBuilderScreen />
      </AppChrome>
    </LoginGate>
  );
}
