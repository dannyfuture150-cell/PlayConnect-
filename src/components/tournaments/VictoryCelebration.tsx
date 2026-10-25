"use client";

import { useEffect } from "react";
import { Trophy, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { PostAuthorSnapshot } from "@/types";

export function VictoryCelebration({
  winner,
  tournamentTitle,
  game,
  onDismiss,
}: {
  winner: PostAuthorSnapshot;
  tournamentTitle: string;
  game: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const confetti = (await import("canvas-confetti")).default;
      if (cancelled) return;

      const duration = 2500;
      const end = Date.now() + duration;
      const colors = ["#A855F7", "#F472B6", "#FBBF24", "#FFFFFF"];

      (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end && !cancelled) requestAnimationFrame(frame);
      })();

      confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 }, colors, startVelocity: 45 });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 px-6 text-center">
      <button onClick={onDismiss} className="absolute right-5 top-5 text-white/60 hover:text-white">
        <X className="h-6 w-6" />
      </button>

      <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-glow animate-fade-up">
        Tournament Champion
      </p>

      <div className="relative mt-6 animate-fade-up">
        <div className="absolute inset-0 animate-pulse-glow rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 blur-2xl" />
        <Trophy className="relative h-24 w-24 text-amber-400 drop-shadow-[0_0_25px_rgba(251,191,36,0.6)]" />
      </div>

      <Avatar className="mt-6 h-20 w-20 ring-4 ring-violet-glow/50 animate-fade-up">
        <AvatarImage src={winner.photoURL ?? undefined} alt={winner.displayName} />
        <AvatarFallback className="text-xl">{winner.displayName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>

      <h1 className="mt-4 font-display text-2xl font-bold text-white animate-fade-up">{winner.displayName}</h1>
      <p className="mt-1 text-sm text-white/60 animate-fade-up">
        Won <span className="font-semibold text-white">{tournamentTitle}</span> · {game}
      </p>

      <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-4 animate-fade-up">
        <p className="text-sm font-bold text-amber-300">🏆 New badge earned</p>
        <p className="text-xs text-white/60">Tournament Champion</p>
      </div>

      <Button size="lg" className="mt-8 animate-fade-up" onClick={onDismiss}>
        View leaderboard
      </Button>
    </div>
  );
}
