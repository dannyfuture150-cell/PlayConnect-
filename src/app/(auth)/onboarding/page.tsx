"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { useAuth } from "@/providers/AuthProvider";
import { PageLoader } from "@/components/shared/PageLoader";
import { readNext } from "@/lib/nextUrl";

export default function OnboardingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && profile?.onboardingComplete) router.replace(readNext() ?? "/feed");
  }, [loading, user, profile, router]);

  if (loading || !user) return <PageLoader />;

  return (
    <AuthShell title="Almost there" subtitle="Pick a username and a game. You can add the rest later.">
      <OnboardingForm />
    </AuthShell>
  );
}
