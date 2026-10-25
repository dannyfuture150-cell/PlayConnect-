"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { PageLoader } from "@/components/shared/PageLoader";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Button } from "@/components/ui/button";

const ADMIN_ONLY = process.env.NEXT_PUBLIC_ADMIN_ONLY === "true";

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
      <p className="max-w-sm text-sm text-steel/60">{body}</p>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

/**
 * Gates every /admin/* route. This is a UI-level convenience redirect — the
 * real security boundary is Firestore's isAdmin() rule, which every admin
 * write in this section relies on. Even if someone bypassed this layout
 * entirely, every mutation (ban, delete, etc.) would still be rejected
 * server-side for a non-admin account.
 *
 * Every state ends in either the panel, a redirect, or an explanatory
 * message — never an endless spinner.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(ADMIN_ONLY ? "/login" : "/feed");
    } else if (profile && !profile.isAdmin && !ADMIN_ONLY) {
      router.replace("/feed");
    }
  }, [user, profile, loading, router]);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (!loading && user && !profile) {
    return (
      <Notice
        title="No profile found"
        body="You're signed in, but this account has no PlayConnect profile yet. Sign in with the account you use in the app."
      >
        <Button onClick={handleSignOut}>Sign out</Button>
      </Notice>
    );
  }

  if (!loading && user && profile && !profile.isAdmin) {
    return (
      <Notice
        title="Not an admin account"
        body="This account doesn't have admin access. Sign in with an admin account, or set isAdmin to true on this user in Firestore."
      >
        <Button onClick={handleSignOut}>Sign out</Button>
      </Notice>
    );
  }

  if (loading || !profile?.isAdmin) {
    if (slow) {
      return (
        <Notice
          title="Taking longer than usual"
          body="The panel couldn't finish loading. Check your connection, or sign out and sign in again."
        >
          <Button onClick={() => window.location.reload()}>Retry</Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </Notice>
      );
    }
    return <PageLoader />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
