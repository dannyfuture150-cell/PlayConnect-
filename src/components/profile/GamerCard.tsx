"use client";

import { Gamepad2 } from "lucide-react";
import { useChallenges, challengeRecord } from "@/hooks/useChallenges";
import { computeOrganizerRank, computeRank, withRankOverride } from "@/lib/rank";
import { connectedGames } from "@/lib/gameAccounts";
import type { UserProfile } from "@/types";

/** Compact gamer summary on a profile: platform, rank, game IDs, favourite games, results. */
export function GamerCard({ profile }: { profile: UserProfile }) {
  const { items } = useChallenges(profile.uid);
  const rec = challengeRecord(items, profile.uid);
  const rank = withRankOverride(
    profile.accountType === "organizer"
      ? computeOrganizerRank(profile.successfulTournamentsOrganized ?? 0, profile.successfulLeaguesOrganized ?? 0)
      : computeRank(profile.followersCount, profile.postsCount, profile.tournamentWins ?? 0),
    profile.rankOverride
  );
  const ids = connectedGames(profile).map((c) => ({
    label: c.def.label,
    value: c.id,
    platform: c.platform,
  }));

  const stat = (label: string, value: string | number) => (
    <div className="flex-1 px-2 py-2.5 text-center">
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-steel/50">{label}</p>
    </div>
  );

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm">
        <Gamepad2 className="h-4 w-4 text-steel/60" />
        <span className="font-semibold">{profile.platform ?? "Gamer"}</span>
        <span className="text-steel/40">·</span>
        <span className="text-steel/80">{rank.skillLevel}</span>
      </div>
      <div className="flex divide-x divide-border">
        {stat("Tournament wins", profile.tournamentWins ?? 0)}
        {stat("1v1 record", `${rec.wins}-${rec.losses}`)}
        {stat("Reputation", Math.round(rank.reputationScore))}
      </div>
      {(profile.favoriteGames?.length > 0 || ids.length > 0) && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          {profile.favoriteGames?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.favoriteGames.map((g) => (
                <span key={g} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-steel/80">{g}</span>
              ))}
            </div>
          )}
          {ids.map((i) => (
            <p key={i.label} className="text-xs text-steel/60">
              {i.label}
              {i.platform ? ` (${i.platform})` : ""}: <span className="font-semibold text-foreground">{i.value}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
