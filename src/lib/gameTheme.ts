import { canonicalGame } from "@/lib/leaderboardGames";

/** Two-colour gradient per game, so every tournament card has its own look at a glance. */
const THEMES: Record<string, [string, string]> = {
  "EA FC": ["#22c55e", "#0f766e"],
  eFootball: ["#3b82f6", "#1e3a8a"],
  "Call of Duty": ["#f59e0b", "#7c2d12"],
  "Dream League Soccer": ["#06b6d4", "#1d4ed8"],
  PUBG: ["#f97316", "#92400e"],
  "Free Fire": ["#ef4444", "#f97316"],
  Valorant: ["#f43f5e", "#7f1d1d"],
  "Mobile Legends": ["#8b5cf6", "#1e40af"],
  "Mortal Kombat": ["#dc2626", "#451a03"],
  "Blood Strike": ["#e11d48", "#4c0519"],
  Racing: ["#eab308", "#b91c1c"],
  Fortnite: ["#a855f7", "#ec4899"],
  "League of Legends": ["#0ea5e9", "#a16207"],
  "Apex Legends": ["#ef4444", "#7f1d1d"],
  Minecraft: ["#65a30d", "#166534"],
  "GTA Online": ["#10b981", "#047857"],
};

const FALLBACK: [string, string] = ["#8b5cf6", "#ec4899"];

export function gameGradient(game: string): string {
  const [a, b] = THEMES[canonicalGame(game)] ?? FALLBACK;
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}
