import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <AuthShell title="Create your player card" subtitle="Join the network built for gamers, by gamers.">
      <SignUpForm />
    </AuthShell>
  );
}
