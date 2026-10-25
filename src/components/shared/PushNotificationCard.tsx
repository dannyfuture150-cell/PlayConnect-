"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import {
  disablePushNotifications,
  enablePushNotifications,
  getNotificationPermission,
  isPushSupported,
} from "@/lib/firebase/push";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PushNotificationCard() {
  const { profile } = useAuth();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isPushSupported().then(setSupported);
    setPermission(getNotificationPermission());
  }, []);

  const isEnabled = !!profile?.fcmTokens?.length && permission === "granted";

  async function handleEnable() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    const result = await enablePushNotifications(profile.uid);
    setLoading(false);
    setPermission(getNotificationPermission());
    if (!result.ok) setError(result.error ?? "Couldn't enable notifications.");
  }

  async function handleDisable() {
    if (!profile) return;
    setLoading(true);
    await disablePushNotifications(profile.uid);
    setLoading(false);
  }

  if (supported === null) return <div className="h-24 animate-pulse rounded-2xl bg-muted" />;

  if (!supported) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <BellOff className="h-5 w-5 shrink-0 text-steel/40" />
        <p className="text-sm text-steel/60">
          Push notifications aren&apos;t supported in this browser. In-app notifications still work as normal.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient">
          <Bell className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Push notifications</h3>
          <p className="text-xs text-steel/50">
            Get notified on this device even when PlayConnect isn&apos;t open — likes, comments, follows, and messages.
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-steel/50">
        This is entirely optional and only applies to this device/browser — turning it on elsewhere is a separate choice.
      </p>

      {isEnabled ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-signal-green/30 bg-signal-green/5 px-3.5 py-2.5">
          <span className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 text-signal-green" /> Enabled on this device
          </span>
          <Button size="sm" variant="outline" onClick={handleDisable} disabled={loading}>
            {loading ? "Turning off…" : "Turn off"}
          </Button>
        </div>
      ) : (
        <Button className="mt-4 w-full" onClick={handleEnable} disabled={loading}>
          {loading ? "Enabling…" : "Enable push notifications"}
        </Button>
      )}

      {permission === "denied" && (
        <p className="mt-2 text-xs text-signal-red">
          Notifications are blocked for this site in your browser settings — you&apos;ll need to allow them there first.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-signal-red">{error}</p>}
    </Card>
  );
}
