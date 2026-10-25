export const LEADERBOARD_GAMES = [
  "EA FC",
  "eFootball",
  "Call of Duty",
  "Dream League Soccer",
  "PUBG",
  "Free Fire",
  "Valorant",
  "Mobile Legends",
  "Mortal Kombat",
  "Blood Strike",
  "Racing",
  "Fortnite",
  "League of Legends",
  "Apex Legends",
  "Minecraft",
  "GTA Online",
];

/** Leaderboard tab that ranks by total tournament wins across every game. */
export const OVERALL = "Overall";

/**
 * Maps whatever was typed/stored (any capitalisation, stray spaces) onto the
 * canonical game name, so wins are always filed under — and found under — the
 * same key. Unknown games keep their own name (minus characters Firestore
 * can't use in a field path).
 */
export function canonicalGame(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const match = LEADERBOARD_GAMES.find((g) => g.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed.replace(/[.~*/\[\]]/g, "");
}
