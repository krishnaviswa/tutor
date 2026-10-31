import { LoginGate } from "@/components/LoginGate";
import { RoleChrome } from "@/components/RoleChrome";
import { ProfileScreen } from "@/components/wired/ProfileScreen";

export default function Page() {
  return (
    <LoginGate role="teacher" accept={["teacher", "owner", "assistant", "student"]}>
      <RoleChrome screenId="profile">
        <ProfileScreen />
      </RoleChrome>
    </LoginGate>
  );
}
