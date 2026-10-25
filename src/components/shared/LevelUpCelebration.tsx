"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { SharePlayerCardButton } from "@/components/shared/SharePlayerCardButton";
import { computeOrganizerRank, computeRank, withRankOverride } from "@/lib/rank";
import type { SkillLevel } from "@/types";

const ORDER: SkillLevel[] = ["Rookie", "Amateur", "Pro", "Elite", "Legend"];

const COPY: Record<SkillLevel, { emoji: string; title: string; line: string }> = {
  Rookie: { emoji: "🎮", title: "Welcome, Rookie", line: "Every legend starts here." },
  Amateur: { emoji: "⭐", title: "You're an Amateur now!", line: "You've proven you can play. Keep climbing." },
  Pro: { emoji: "🔥", title: "You are a Pro now!", line: "People know your name. Time to show them why." },
  Elite: { emoji: "💎", title: "You're Elite!", line: "Only a few players get this far. Respect." },
  Legend: { emoji: "👑", title: "You're a LEGEND!", line: "The top of PlayConnect. Everyone is chasing you now." },
};

/** Full-screen "you levelled up" moment, shown once per new level. */
export function LevelUpCelebration() {
  const { profile } = useAuth();
  const [show, setShow] = useState<SkillLevel | null>(null);

  const rank = profile
    ? withRankOverride(
        profile.accountType === "organizer"
          ? computeOrganizerRank(profile.successfulTournamentsOrganized ?? 0, profile.successfulLeaguesOrganized ?? 0)
          : computeRank(profile.followersCount ?? 0, profile.postsCount ?? 0, profile.tournamentWins ?? 0),
        profile.rankOverride
      )
    : null;
  const level = rank?.skillLevel ?? null;
  const celebrated = profile?.celebratedLevel;
  const uid = profile?.uid;

  useEffect(() => {
    if (!uid || !level) return;
    const save = (l: SkillLevel) => updateDoc(doc(db, "users", uid), { celebratedLevel: l }).catch(() => undefined);
    if (!celebrated) {
      // First time we see this account: remember the level quietly.
      save(level);
    } else if (ORDER.indexOf(level) > ORDER.indexOf(celebrated)) {
      setShow(level);
    } else if (ORDER.indexOf(level) < ORDER.indexOf(celebrated)) {
      save(level);
    }
  }, [uid, level, celebrated]);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    (async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        if (cancelled) return;
        confetti({ particleCount: 140, spread: 100, origin: { y: 0.4 }, startVelocity: 45, colors: ["#A855F7", "#F472B6", "#FBBF24", "#FFFFFF"] });
      } catch {
        // confetti is just decoration
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show]);

  if (!show || !uid || !rank) return null;
  const copy = COPY[show];

  function close() {
    if (uid && show) updateDoc(doc(db, "users", uid), { celebratedLevel: show }).catch(() => undefined);
    setShow(null);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-6">
      <style>{`@keyframes pcLvl{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}`}</style>
      <div
        className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-violet/40 bg-gradient-to-b from-[#2a1f5e] to-[#0b0720] p-8 text-center"
        style={{ animation: "pcLvl .6s ease-out both" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-glow">Level up</p>
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-gradient text-6xl shadow-[0_0_40px_hsl(var(--violet)/0.6)]">
          {copy.emoji}
        </div>
        <h2 className="font-display text-2xl font-extrabold text-white">{copy.title}</h2>
        <p className="text-sm text-white/70">{copy.line}</p>
        <p className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white">
          {rank.nextRank && rank.pointsToNextRank != null
            ? `${rank.pointsToNextRank} points to ${rank.nextRank}`
            : "You reached the top rank"}
        </p>
        {profile && (
          <SharePlayerCardButton
            profile={profile}
            headline={`⬆ Promoted to ${show}`}
            label="Share my new rank card"
            className="border-0 bg-yellow-400 text-black"
          />
        )}
        <button onClick={close} className="mt-1 w-full rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white active:scale-95">
          Let&apos;s go!
        </button>
      </div>
    </div>
  );
}
