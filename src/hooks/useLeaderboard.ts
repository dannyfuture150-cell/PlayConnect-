"use client";

import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { UserProfile } from "@/types";
import { OVERALL, canonicalGame } from "@/lib/leaderboardGames";

export interface LeaderboardEntry {
  profile: UserProfile;
  wins: number;
}

/**
 * Ranks players by wins in the given game. Pulls the 200 users with the most
 * tournament wins as a candidate pool (avoids scanning the entire users collection),
 * then sorts that pool client-side by gameWins[game] — Firestore can't
 * natively order by a dynamic map key, so this is the practical tradeoff at
 * this app's scale rather than maintaining a separate leaderboard
 * collection via a Cloud Function.
 */
function winsFor(profile: UserProfile, game: string): number {
  if (game === OVERALL) {
    // Total across every game; fall back to the raw counter for older accounts.
    const fromGames = Object.values(profile.gameWins ?? {}).reduce((sum, n) => sum + (n || 0), 0);
    return Math.max(fromGames, profile.tournamentWins ?? 0);
  }
  // Add up any keys that are the same game written differently ("call of duty" / "Call of Duty").
  return Object.entries(profile.gameWins ?? {}).reduce(
    (sum, [key, n]) => (canonicalGame(key).toLowerCase() === game.toLowerCase() ? sum + (n || 0) : sum),
    0
  );
}

export function useLeaderboard(game: string) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", game],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "users"), orderBy("tournamentWins", "desc"), limit(200)));
      const entries: LeaderboardEntry[] = snap.docs
        .map((d) => d.data() as UserProfile)
        .filter((p) => !!p.username)
        .map((profile) => ({ profile, wins: winsFor(profile, game) }))
        .filter((e) => e.wins > 0)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 50);
      return entries;
    },
    enabled: !!game,
  });
}
