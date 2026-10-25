import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to catch up on your feed and your squad.">
      <LoginForm />
    </AuthShell>
  );
}
