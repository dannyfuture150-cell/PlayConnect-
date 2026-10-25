"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { enablePushNotifications, getNotificationPermission, isPushSupported } from "@/lib/firebase/push";
import { Button } from "@/components/ui/button";

const KEY = "pc-push-prompt-dismissed";

/** One-tap "turn on phone alerts" card at the top of the feed. Hidden once enabled/dismissed/unsupported. */
export function PushPromptBanner() {
  const { profile } = useAuth();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) return;
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {}
    isPushSupported().then((ok) => {
      if (ok && getNotificationPermission() === "default") setShow(true);
    });
  }, []);

  if (!show || !profile) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  }

  async function enable() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    const res = await enablePushNotifications(profile.uid);
    setBusy(false);
    if (res.ok) setShow(false);
    else setError(res.error ?? "Couldn't turn on alerts.");
  }

  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-violet/30 bg-violet/10 p-4">
      <BellRing className="h-5 w-5 shrink-0 text-violet-glow" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Get alerts on your phone</p>
        <p className="text-xs text-steel/60">Messages, likes, followers, lives and tournament wins — even when the app is closed.</p>
        {error && <p className="mt-1 text-xs text-signal-red">{error}</p>}
      </div>
      <Button size="sm" onClick={enable} disabled={busy}>
        {busy ? "…" : "Turn on"}
      </Button>
      <button onClick={dismiss} className="absolute right-1.5 top-1.5 p-1 text-steel/40 hover:text-steel" aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
