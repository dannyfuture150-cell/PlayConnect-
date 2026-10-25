import type { SkillLevel } from "@/types";

// Reputation is deliberately hard to earn and weighted toward actually
// competing and showing up, not just being popular:
//   - Tournament wins are worth the most, by a wide margin — this is the
//     one thing that should move your rank the most.
//   - Being active (posting) counts for something real, but is capped so
//     someone can't farm rank by spamming the feed.
//   - Followers still count a little (being known in the community isn't
//     nothing), but are heavily devalued and capped — popularity alone
//     should never be enough to reach the top ranks on its own.
const POINTS_PER_TOURNAMENT_WIN = 50;
const POINTS_PER_POST = 2;
const MAX_POSTS_COUNTED = 100; // caps activity's contribution at 200 points
const POINTS_PER_FOLLOWER = 0.4;
const MAX_FOLLOWERS_COUNTED = 500; // caps followers' contribution at 200 points

const RANK_THRESHOLDS: { min: number; level: SkillLevel }[] = [
  { min: 6000, level: "Legend" }, // 120 tournament wins
  { min: 2500, level: "Elite" }, // 50 tournament wins
  { min: 1250, level: "Pro" }, // 25 tournament wins
  { min: 500, level: "Amateur" }, // 10 tournament wins
  { min: 0, level: "Rookie" },
];

export interface RankResult {
  reputationScore: number;
  skillLevel: SkillLevel;
  /** Points needed to reach the next rank, or null if already at the top (Legend). */
  pointsToNextRank: number | null;
  nextRank: SkillLevel | null;
}

// Organizer reputation is a completely separate track from player
// reputation — it's tied purely to successfully completed events (a
// tournament with a decided champion, or a league that played out its full
// schedule), not to anything else. Organizing something that never
// finishes earns nothing; running it to completion is what counts.
const POINTS_PER_SUCCESSFUL_EVENT = 200;

const ORGANIZER_RANK_THRESHOLDS: { min: number; level: SkillLevel }[] = [
  { min: 2400, level: "Legend" }, // 12 successful events
  { min: 1200, level: "Elite" }, // 6 successful events
  { min: 600, level: "Pro" }, // 3 successful events
  { min: 200, level: "Amateur" }, // 1 successful event
  { min: 0, level: "Rookie" },
];

export function computeOrganizerRank(successfulTournaments: number, successfulLeagues: number): RankResult {
  const reputationScore = (successfulTournaments + successfulLeagues) * POINTS_PER_SUCCESSFUL_EVENT;

  const currentIndex = ORGANIZER_RANK_THRESHOLDS.findIndex((t) => reputationScore >= t.min);
  const current = ORGANIZER_RANK_THRESHOLDS[currentIndex];
  const next = currentIndex > 0 ? ORGANIZER_RANK_THRESHOLDS[currentIndex - 1] : null;

  return {
    reputationScore,
    skillLevel: current.level,
    nextRank: next?.level ?? null,
    pointsToNextRank: next ? next.min - reputationScore : null,
  };
}

/**
 * Computes reputation + rank on the fly from already-reliable stored
 * counters (followersCount, postsCount, tournamentWins) rather than
 * maintaining a separate synced field that has to be kept in lockstep via
 * every follow/post/tournament win — that class of bug (a counter silently
 * drifting out of sync) is exactly what's caused several of PlayConnect's
 * earlier bugs.
 */
export function computeRank(followersCount: number, postsCount: number, tournamentWins: number): RankResult {
  const reputationScore = Math.round(
    tournamentWins * POINTS_PER_TOURNAMENT_WIN +
      Math.min(postsCount, MAX_POSTS_COUNTED) * POINTS_PER_POST +
      Math.min(followersCount, MAX_FOLLOWERS_COUNTED) * POINTS_PER_FOLLOWER
  );

  const currentIndex = RANK_THRESHOLDS.findIndex((t) => reputationScore >= t.min);
  const current = RANK_THRESHOLDS[currentIndex];
  const next = currentIndex > 0 ? RANK_THRESHOLDS[currentIndex - 1] : null;

  return {
    reputationScore,
    skillLevel: current.level,
    nextRank: next?.level ?? null,
    pointsToNextRank: next ? next.min - reputationScore : null,
  };
}

export const ALL_RANKS: SkillLevel[] = ["Rookie", "Amateur", "Pro", "Elite", "Legend"];

/** If an admin has set a rank by hand, it replaces the automatic one (and the score jumps to that rank's starting score). */
export function withRankOverride(rank: RankResult, override: SkillLevel | null | undefined): RankResult {
  if (!override) return rank;
  const idx = RANK_THRESHOLDS.findIndex((t) => t.level === override);
  if (idx < 0) return rank;
  const next = idx > 0 ? RANK_THRESHOLDS[idx - 1] : null;
  const score = Math.max(RANK_THRESHOLDS[idx].min, rank.skillLevel === override ? rank.reputationScore : 0);
  return {
    reputationScore: score,
    skillLevel: override,
    nextRank: next?.level ?? null,
    pointsToNextRank: next ? Math.max(0, next.min - score) : null,
  };
}
