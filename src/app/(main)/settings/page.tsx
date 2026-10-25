"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useAuthActions } from "@/hooks/useAuthActions";
import { EditProfileForm } from "@/components/profile/EditProfileForm";
import { AccountTypeSwitcher } from "@/components/profile/AccountTypeSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { AccentThemePicker } from "@/components/shared/AccentThemePicker";
import { PushNotificationCard } from "@/components/shared/PushNotificationCard";
import { InstallAppCard } from "@/components/shared/InstallAppCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "profile";
  const [resetSent, setResetSent] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    if (!auth.currentUser) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken(true)}` },
      });
      const out = await res.json().catch(() => null);
      if (!res.ok || !out?.ok) throw new Error(out?.error || "Couldn't delete the account.");
      await signOut().catch(() => undefined);
      router.push("/login");
    } catch (e: any) {
      setDeleteError(e?.message || "Couldn't delete the account.");
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  async function handleResetPassword() {
    if (!user?.email) return;
    await sendPasswordResetEmail(auth, user.email);
    setResetSent(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>

      <Tabs.Root defaultValue={initialTab}>
        <Tabs.List className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {["profile", "account", "notifications", "app"].map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-xs font-medium capitalize text-steel/60 transition-colors sm:text-sm",
                "data-[state=active]:bg-muted data-[state=active]:text-foreground"
              )}
            >
              {tab}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="profile" className="mt-6 flex flex-col gap-5">
          <AccountTypeSwitcher />
          <Card className="p-6">
            <EditProfileForm />
          </Card>
        </Tabs.Content>

        <Tabs.Content value="notifications" className="mt-6">
          <PushNotificationCard />
        </Tabs.Content>

        <Tabs.Content value="app" className="mt-6">
          <InstallAppCard />
        </Tabs.Content>

        <Tabs.Content value="account" className="mt-6">
          <Card className="flex flex-col gap-5 p-6">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">Appearance</h3>
              <p className="mt-1 text-sm text-steel/50">Switch between light and dark.</p>
              <div className="mt-3">
                <ThemeToggle variant="labeled" />
              </div>
              <p className="mt-4 text-sm text-steel/50">Accent color — optional, purely cosmetic.</p>
              <div className="mt-2">
                <AccentThemePicker />
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="font-display text-base font-semibold text-foreground">Email</h3>
              <p className="mt-1 text-sm text-steel/50">{user?.email}</p>
            </div>

            <div className="border-t border-border/60 pt-5">
              <h3 className="font-display text-base font-semibold text-foreground">Password</h3>
              <p className="mt-1 text-sm text-steel/50">Send a reset link to your inbox.</p>
              <Button variant="outline" className="mt-3" onClick={handleResetPassword} disabled={resetSent}>
                {resetSent ? "Reset link sent" : "Send reset link"}
              </Button>
            </div>

            <div className="border-t border-border/60 pt-5">
              <h3 className="font-display text-base font-semibold text-foreground">Sign out</h3>
              <p className="mt-1 text-sm text-steel/50">End your session on this device.</p>
              <Button variant="outline" className="mt-3" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>

            <div className="border-t border-border/60 pt-5">
              <h3 className="font-display text-base font-semibold text-signal-red">Delete account</h3>
              <p className="mt-1 text-sm text-steel/50">
                Permanently removes your profile, posts, and data. This cannot be undone.
              </p>
              {!confirmDelete ? (
                <Button variant="destructive" className="mt-3" onClick={() => setConfirmDelete(true)}>
                  Delete account
                </Button>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-sm text-foreground">Type <strong>DELETE</strong> to confirm:</p>
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground"
                    placeholder="DELETE"
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" disabled={typed !== "DELETE" || deleting} onClick={handleDeleteAccount}>
                      {deleting ? "Deleting…" : "Permanently delete"}
                    </Button>
                    <Button variant="outline" disabled={deleting} onClick={() => { setConfirmDelete(false); setTyped(""); }}>
                      Cancel
                    </Button>
                  </div>
                  {deleteError && <p className="text-sm text-signal-red">{deleteError}</p>}
                </div>
              )}
              <Link href="/privacy" className="mt-4 inline-block text-sm text-violet-glow underline">Privacy policy</Link>
            </div>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
