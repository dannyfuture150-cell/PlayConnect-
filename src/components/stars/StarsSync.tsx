"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { callStars } from "@/hooks/useStars";

/**
 * Quietly collects any stars you've earned (daily login, tournaments, challenges, referrals).
 * Runs when the app opens and whenever you come back to it, at most every 15 minutes.
 * It runs again once your profile is finished, so a new player's welcome bonus isn't missed.
 */
export function StarsSync() {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const ready = !!profile?.onboardingComplete;
  useEffect(() => {
    if (!uid) return;
    const key = `playconnect-stars-sync-${uid}-${ready ? 1 : 0}`;
    function run() {
      try {
        const last = Number(localStorage.getItem(key) ?? 0);
        if (Date.now() - last < 15 * 60 * 1000) return;
      } catch {}
      callStars({ action: "sync" })
        .then((r) => {
          if (r.ok) {
            try { localStorage.setItem(key, String(Date.now())); } catch {}
          }
        })
        .catch(() => undefined);
    }
    run();
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [uid, ready]);
  return null;
}
