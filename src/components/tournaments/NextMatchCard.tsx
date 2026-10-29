"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { ArrowRight, Swords } from "lucide-react";
import { db } from "@/lib/firebase/client";
import type { Tournament, TournamentMatch } from "@/types";

function roundName(round: number, totalRounds: number) {
  if (round === totalRounds) return "Final";
  if (round === totalRounds - 1) return "Semifinal";
  if (round === totalRounds - 2) return "Quarterfinal";
  return `Round ${round}`;
}

export interface NextMatch {
  t: Tournament;
  mine: TournamentMatch;
  opp: TournamentMatch["player1"];
  label: string;
}

/** The match each of this player's started tournaments is waiting on them to play. Small reads, refreshed every few minutes. */
export function useMyNextMatches(tournaments: Tournament[], uid: string | undefined): NextMatch[] {
  const started = uid ? tournaments.filter((t) => t.bracketStarted && t.status !== "completed").slice(0, 3) : [];
  const results = useQueries({
    queries: started.map((t) => ({
      queryKey: ["next-match", t.id],
      staleTime: 3 * 60_000,
      queryFn: async () => {
        const snap = await getDocs(collection(db, "tournaments", t.id, "matches"));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentMatch));
      },
    })),
  });

  return started.flatMap((t, i) => {
    const matches = (results[i]?.data ?? []) as TournamentMatch[];
    if (!matches.length) return [];
    const totalRounds = Math.max(...matches.map((m) => m.round));
    const mine = matches
      .filter((m) => !m.isBye && !m.winnerId && (m.player1Id === uid || m.player2Id === uid))
      .sort((a, b) => a.round - b.round || a.slot - b.slot)[0];
    if (!mine) return [];
    const opp = mine.player1Id === uid ? mine.player2 : mine.player1;
    return [{ t, mine, opp, label: roundName(mine.round, totalRounds) }];
  });
}

/** "My next match": shown at the top of the Tournaments tab. */
export function NextMatchCard({ tournaments, uid }: { tournaments: Tournament[]; uid: string }) {
  const cards = useMyNextMatches(tournaments, uid);
  if (!cards.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wide text-steel/60">My next match</p>
      {cards.map(({ t, mine, opp, label }) => (
        <Link
          key={mine.id}
          href={`/tournaments/${t.id}`}
          className="flex items-center gap-3 rounded-2xl bg-brand-gradient p-4 text-white shadow-lg"
        >
          <Swords className="h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {opp ? `vs ${opp.displayName}` : "Waiting for your opponent"}
            </p>
            <p className="truncate text-xs text-white/80">{t.title} · {label}</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0" />
        </Link>
      ))}
    </div>
  );
}
