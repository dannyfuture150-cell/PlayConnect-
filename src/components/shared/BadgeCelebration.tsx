"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";

/** Splits "🏆 Tournament Champion" into its emoji and name. */
function parts(badge: string) {
  const m = badge.match(/^(\S+)\s+(.*)$/u);
  return m ? { emoji: m[1], name: m[2] } : { emoji: "🏅", name: badge };
}

/** Full-screen "you earned a badge" moment, shown once per new badge the next time the app is open. */
export function BadgeCelebration() {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const badges = profile?.badges;
  const celebrated = profile?.celebratedBadges;

  const fresh = useMemo(() => (badges ?? []).filter((b) => !(celebrated ?? []).includes(b)), [badges, celebrated]);
  // Accounts from before this feature: mark what they already have as seen, so nobody gets old badges replayed.
  const firstRun = celebrated === undefined;

  useEffect(() => {
    if (!uid || !firstRun || !badges) return;
    updateDoc(doc(db, "users", uid), { celebratedBadges: badges }).catch(() => undefined);
  }, [uid, firstRun, badges]);

  const badge = !firstRun && fresh.length > 0 ? fresh[0] : null;

  useEffect(() => {
    if (!badge) return;
    let cancelled = false;
    (async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        if (cancelled) return;
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.4 }, startVelocity: 40, colors: ["#A855F7", "#F472B6", "#FBBF24", "#FFFFFF"] });
      } catch {
        // decoration only
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [badge]);

  if (!badge || !uid) return null;
  const { emoji, name } = parts(badge);

  function close() {
    updateDoc(doc(db, "users", uid!), { celebratedBadges: arrayUnion(badge) }).catch(() => undefined);
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-6">
      <style>{`@keyframes pcBadge{0%{transform:scale(.4) rotate(-12deg);opacity:0}70%{transform:scale(1.1) rotate(4deg)}100%{transform:scale(1) rotate(0);opacity:1}}`}</style>
      <div
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-white/15 bg-gradient-to-b from-[#2a1f5e] to-[#0b0720] p-8 text-center"
        style={{ animation: "pcBadge .6s ease-out both" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/70">New badge</p>
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-6xl shadow-[0_0_40px_rgba(255,255,255,0.25)]">{emoji}</div>
        <h2 className="font-display text-2xl font-extrabold text-white">You earned {name}!</h2>
        <p className="text-sm text-white/70">It&apos;s now on your profile for everyone to see.</p>
        {profile && (
          <Link href={`/profile/${profile.username}`} onClick={close} className="text-sm font-semibold text-white underline">
            See it on my profile
          </Link>
        )}
        <button onClick={close} className="mt-1 w-full rounded-xl bg-white py-3 text-sm font-bold text-black active:scale-95">
          Awesome!
        </button>
      </div>
    </div>
  );
}
