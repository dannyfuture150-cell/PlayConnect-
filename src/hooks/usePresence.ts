"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const BEAT_MS = 60_000; // how often we say "I'm here"
const ONLINE_WINDOW_MS = 150_000; // seen within 2.5 minutes = online

/**
 * Keeps presence/{uid}.lastActive fresh while the app is open and visible.
 * Lives in its own tiny document (not the profile) so the beat never
 * re-renders the rest of the app.
 */
export function usePresenceHeartbeat(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;
    const beat = () => {
      if (document.visibilityState === "visible") {
        setDoc(doc(db, "presence", uid), { lastActive: serverTimestamp() }, { merge: true }).catch(() => {});
      }
    };
    beat();
    const id = setInterval(beat, BEAT_MS);
    const onVisible = () => beat();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [uid]);
}

/** Live "online / last seen" for one person. */
export function usePresence(uid: string | undefined) {
  const [lastActive, setLastActive] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "presence", uid),
      (snap) => {
        const ts = snap.data()?.lastActive;
        setLastActive(ts?.toDate ? ts.toDate() : null);
      },
      () => setLastActive(null)
    );
  }, [uid]);

  // "Online" expires on its own if the beats stop, so re-check every 30s.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const online = !!lastActive && now - lastActive.getTime() < ONLINE_WINDOW_MS;
  return { online, lastActive };
}
