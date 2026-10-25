"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useAuthActions } from "@/hooks/useAuthActions";
import { PageLoader } from "@/components/shared/PageLoader";

/**
 * Wrap any (main) route with this. Redirects to /login if signed out, and to
 * /onboarding if signed in but the profile hasn't been completed yet.
 */
// A shared tournament link can be opened without an account; everything else needs sign-in.
const PUBLIC_PATH = /^\/tournaments\/[^/]+\/?$/;

export function AuthGuard({ children, publicFallback }: { children: ReactNode; publicFallback?: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = !!pathname && PUBLIC_PATH.test(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (isPublic) return; // visitors can look; the page itself asks them to sign up to join
      router.replace(pathname && pathname !== "/feed" ? `/login?next=${encodeURIComponent(pathname)}` : "/login");
      return;
    }
    if (profile && !profile.onboardingComplete) {
      // Keep the link they were opening, so after setup they land back on it.
      const back = typeof window !== "undefined" ? window.location.pathname + window.location.search : pathname;
      router.replace(back && back !== "/feed" ? `/onboarding?next=${encodeURIComponent(back)}` : "/onboarding");
    }
  }, [user, profile, loading, router, pathname, isPublic]);

  if (!loading && !user && isPublic && publicFallback) {
    return <>{publicFallback}</>;
  }

  if (loading || !user || (profile && !profile.onboardingComplete)) {
    return <PageLoader />;
  }

  if (profile?.isBanned) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="font-display text-xl font-bold text-foreground">Account suspended</h1>
        <p className="max-w-sm text-sm text-steel/60">
          Your account has been suspended by a PlayConnect admin. If you think this is a mistake, reach out through
          the community you joined from.
        </p>
        <button
          onClick={() => signOut().then(() => router.replace("/login"))}
          className="mt-2 text-sm font-medium text-violet-glow hover:underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
