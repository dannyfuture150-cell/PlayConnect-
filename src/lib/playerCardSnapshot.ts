import { computeOrganizerRank, computeRank, withRankOverride } from "@/lib/rank";
import type { PlayerCardSnapshot, SkillLevel, UserProfile } from "@/types";

export const RANK_THEME: Record<SkillLevel, { a: string; b: string; text: string }> = {
  Rookie: { a: "#d08a4a", b: "#6b3d14", text: "#fff" },
  Amateur: { a: "#e4e4e7", b: "#52525b", text: "#fff" },
  Pro: { a: "#fde68a", b: "#a16207", text: "#fff" },
  Elite: { a: "#67e8f9", b: "#6d28d9", text: "#fff" },
  Legend: { a: "#f0abfc", b: "#d97706", text: "#fff" },
};

/** Freezes a profile's current numbers into a card that can be posted. */
export function makeCardSnapshot(profile: UserProfile, extra: { headline?: string; tournamentTitle?: string; game?: string; style?: string | null; title?: string | null } = {}): PlayerCardSnapshot {
  const rank = withRankOverride(
    profile.accountType === "organizer"
      ? computeOrganizerRank(profile.successfulTournamentsOrganized ?? 0, profile.successfulLeaguesOrganized ?? 0)
      : computeRank(profile.followersCount, profile.postsCount, profile.tournamentWins ?? 0),
    profile.rankOverride
  );
  return {
    displayName: profile.displayName,
    username: profile.username,
    photoURL: profile.photoURL ?? null,
    rank: rank.skillLevel,
    reputation: Math.round(rank.reputationScore),
    platform: profile.platform ?? null,
    followers: profile.followersCount ?? 0,
    wins: profile.tournamentWins ?? 0,
    games: (profile.favoriteGames ?? []).slice(0, 4),
    ...(extra.headline ? { headline: extra.headline } : {}),
    ...(extra.tournamentTitle ? { tournamentTitle: extra.tournamentTitle } : {}),
    ...(extra.game ? { game: extra.game } : {}),
    ...(extra.style ? { style: extra.style } : {}),
    ...(extra.title ? { title: extra.title } : {}),
  };
}
