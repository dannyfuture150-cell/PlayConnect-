import type { CSSProperties } from "react";

export type StarSlot = "frame" | "cardstyle" | "title" | "namecolor" | "banner" | "unlock";
export const STAR_SLOTS: StarSlot[] = ["frame", "cardstyle", "title", "namecolor", "banner"];
export const SLOT_LABEL: Record<StarSlot, string> = {
  frame: "Profile frames",
  cardstyle: "Player card styles",
  title: "Titles",
  namecolor: "Name colours",
  banner: "Profile banners",
  unlock: "Extras",
};

export interface StarItem {
  id: string;
  name: string;
  slot: StarSlot;
  price: number;
  desc: string;
  /** Only players with at least one tournament win can redeem it. */
  winnersOnly?: boolean;
}

export const STAR_ITEMS: StarItem[] = [
  // Frames
  { id: "frame_neon", name: "Neon Frame", slot: "frame", price: 100, desc: "A glowing cyan-purple ring around your profile photo." },
  { id: "frame_fire", name: "Fire Frame", slot: "frame", price: 120, desc: "A blazing orange ring." },
  { id: "frame_ice", name: "Ice Frame", slot: "frame", price: 120, desc: "A cool icy-blue ring." },
  { id: "frame_gold", name: "Champion Frame", slot: "frame", price: 150, desc: "Solid gold. Only for tournament winners.", winnersOnly: true },
  { id: "frame_royal", name: "Royal Frame", slot: "frame", price: 200, desc: "Deep purple with a gold edge." },
  { id: "frame_emerald", name: "Emerald Frame", slot: "frame", price: 200, desc: "Rich green with a bright shine." },
  { id: "frame_aurora", name: "Aurora Frame", slot: "frame", price: 350, desc: "Animated northern-lights ring that keeps moving." },
  { id: "frame_diamond", name: "Diamond Frame", slot: "frame", price: 400, desc: "Animated sparkling diamond-white ring." },
  // Card styles
  { id: "card_pitch", name: "Pitch Card", slot: "cardstyle", price: 150, desc: "Green football-pitch player card." },
  { id: "card_midnight", name: "Midnight Card", slot: "cardstyle", price: 200, desc: "Dark, sleek player card." },
  { id: "card_inferno", name: "Inferno Card", slot: "cardstyle", price: 250, desc: "Red-hot flames player card." },
  { id: "card_holo", name: "Holo Card", slot: "cardstyle", price: 300, desc: "Shimmering holographic player card." },
  { id: "card_royal", name: "Royal Card", slot: "cardstyle", price: 350, desc: "Purple and gold, like a rare collectible." },
  { id: "card_cyber", name: "Cyber Card", slot: "cardstyle", price: 400, desc: "Electric blue-green futuristic card." },
  // Titles (shown under your name and on your cards)
  { id: "title_gg", name: "🤝 GG Gentleman", slot: "title", price: 80, desc: "A good sport, win or lose." },
  { id: "title_goal", name: "⚽ Goal Machine", slot: "title", price: 80, desc: "For the ones who always score." },
  { id: "title_clutch", name: "🔥 Clutch King", slot: "title", price: 100, desc: "Wins when it matters." },
  { id: "title_sweat", name: "💦 Pure Sweat", slot: "title", price: 100, desc: "Plays every match like a final." },
  { id: "title_captain", name: "🎯 Captain", slot: "title", price: 120, desc: "Leads from the front." },
  { id: "title_legend", name: "👑 Legend in the Making", slot: "title", price: 200, desc: "Watch this space." },
  { id: "title_champ", name: "🏆 Champion", slot: "title", price: 200, desc: "Only for tournament winners.", winnersOnly: true },
  // Name colours
  { id: "name_gold", name: "Gold Name", slot: "namecolor", price: 150, desc: "Your name in shining gold." },
  { id: "name_neon", name: "Neon Name", slot: "namecolor", price: 150, desc: "Cyan to green glow." },
  { id: "name_fire", name: "Fire Name", slot: "namecolor", price: 200, desc: "Orange to red heat." },
  { id: "name_rainbow", name: "Rainbow Name", slot: "namecolor", price: 300, desc: "Animated rainbow colours." },
  { id: "name_neonpurple", name: "Neon Purple Name", slot: "namecolor", price: 500, desc: "Glowing animated neon purple. Everyone in chat will notice you." },
  // Banners
  { id: "banner_sunset", name: "Sunset Banner", slot: "banner", price: 120, desc: "Warm orange and pink." },
  { id: "banner_pitch", name: "Pitch Banner", slot: "banner", price: 150, desc: "Green stripes like a football pitch." },
  { id: "banner_midnight", name: "Midnight Banner", slot: "banner", price: 150, desc: "Deep blue night sky." },
  { id: "banner_aurora", name: "Aurora Banner", slot: "banner", price: 180, desc: "Soft green and purple lights." },
  { id: "banner_neon", name: "Neon Banner", slot: "banner", price: 250, desc: "Animated glowing cyan and purple." },
];

export const STAR_RULES = {
  daily: 1,
  streakBonus: 5, // every 7th day in a row
  join: 1,
  win: 25,
  challengeWin: 2,
  challengeWinsPerDay: 3,
  referrer: 10, // when a referred player joins their first tournament
  referee: 5, // welcome bonus for the player who was referred
  maxReferrals: 20,
  createTournamentFee: 2, // organisers pay this each time they create a tournament
  sellFee: 5, // sellers pay this each time they post something in the shop
  sendMinPosts: 3, // to send PlayCoins you need this many posts...
  sendMinTournaments: 1, // ...and to have joined this many tournaments (as a player)
  sendMax: 100, // most you can send in one go
  sendDailyLimit: 150, // most you can send in a day
  tournamentFeePercent: 0, // taken from the organiser's payout when entry fees are released (0 = organiser keeps it all)
  shopFeePercent: 10, // taken from the seller's payout when a PlayCoins sale completes
  streakBigBonus: 25, // every 30th day in a row
  shieldPrice: 15, // Streak Shield: saves your streak if you miss one day
  maxShields: 2,
  missionAllBonus: 5, // extra for finishing every weekly mission
  shopAutoReleaseDays: 3, // after the seller marks delivered, stars are released automatically
};

/** One-time unlocks. Owning one gives you its feature (it isn't "equipped"). */
export const UNLOCKS: StarItem[] = [
  { id: "unlock_chat", name: "Chat Customiser", slot: "unlock", price: 200, desc: "Choose your own chat bubble colour and chat wallpaper." },
  { id: "unlock_profilebg", name: "Profile Background", slot: "unlock", price: 200, desc: "Put a colour or your own photo behind your profile." },
];

export const itemById = (id: string) => STAR_ITEMS.find((i) => i.id === id) ?? UNLOCKS.find((i) => i.id === id);

/** Chat bubble colours (used for the messages you send). */
export const CHAT_BUBBLES: Record<string, { name: string; bg: string }> = {
  violet: { name: "Violet", bg: "linear-gradient(135deg,#7c3aed,#a855f7)" },
  ocean: { name: "Ocean", bg: "linear-gradient(135deg,#0ea5e9,#2563eb)" },
  mint: { name: "Mint", bg: "linear-gradient(135deg,#10b981,#059669)" },
  sunset: { name: "Sunset", bg: "linear-gradient(135deg,#f97316,#ec4899)" },
  fire: { name: "Fire", bg: "linear-gradient(135deg,#ef4444,#f97316)" },
  rose: { name: "Rose", bg: "linear-gradient(135deg,#ec4899,#be185d)" },
  gold: { name: "Gold", bg: "linear-gradient(135deg,#d97706,#f59e0b)" },
  night: { name: "Night", bg: "linear-gradient(135deg,#1e293b,#475569)" },
};

/** Chat wallpapers (what you see behind the messages, only on your screen). */
export const CHAT_WALLPAPERS: Record<string, { name: string; style: CSSProperties }> = {
  night: { name: "Night sky", style: { background: "linear-gradient(180deg,#020617,#1e1b4b)" } },
  pitch: { name: "Pitch", style: { background: "repeating-linear-gradient(90deg,#14532d 0 36px,#166534 36px 72px)" } },
  sunset: { name: "Sunset", style: { background: "linear-gradient(160deg,#7c2d12,#be185d,#4c1d95)" } },
  ocean: { name: "Ocean", style: { background: "linear-gradient(180deg,#0c4a6e,#0e7490)" } },
  forest: { name: "Forest", style: { background: "linear-gradient(180deg,#052e16,#14532d)" } },
  grape: { name: "Grape", style: { background: "linear-gradient(160deg,#2e1065,#6d28d9)" } },
  dots: { name: "Dots", style: { backgroundColor: "#0f172a", backgroundImage: "radial-gradient(#334155 1.5px, transparent 1.5px)", backgroundSize: "20px 20px" } },
  mono: { name: "Plain dark", style: { background: "#0b0f1a" } },
};

export interface ChatStyle { bubble?: string | null; wallpaper?: string | null }
export const bubbleStyle = (id: string | null | undefined): CSSProperties | undefined =>
  id && CHAT_BUBBLES[id] ? { backgroundImage: CHAT_BUBBLES[id].bg, color: "#fff" } : undefined;
export const wallpaperStyle = (id: string | null | undefined): CSSProperties | undefined => (id ? CHAT_WALLPAPERS[id]?.style : undefined);

/** Profile backgrounds: ready-made ones, or a player's own photo. */
export const PROFILE_BGS: Record<string, { name: string; style: CSSProperties }> = {
  aurora: { name: "Aurora", style: { background: "linear-gradient(135deg,#064e3b,#34d399 40%,#6d28d9 75%,#0f172a)" } },
  sunset: { name: "Sunset", style: { background: "linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)" } },
  ocean: { name: "Ocean", style: { background: "linear-gradient(160deg,#0c4a6e,#0891b2,#0f172a)" } },
  pitch: { name: "Pitch", style: { background: "repeating-linear-gradient(90deg,#15803d 0 44px,#16a34a 44px 88px)" } },
  ember: { name: "Ember", style: { background: "linear-gradient(160deg,#450a0a,#b91c1c,#f97316)" } },
  midnight: { name: "Midnight", style: { background: "linear-gradient(180deg,#020617,#1e3a8a)" } },
  royal: { name: "Royal", style: { background: "linear-gradient(135deg,#312e81,#7c3aed,#fbbf24)" } },
  mono: { name: "Graphite", style: { background: "linear-gradient(135deg,#0f172a,#334155)" } },
};
export interface ProfileBg { type: "preset" | "image"; value: string }


const ANIM = "pcShimmer 4s linear infinite";

const FRAME_COLORS: Record<string, { stops: string; glow: string }> = {
  frame_neon: { stops: "#22d3ee, #a855f7, #22d3ee", glow: "#22d3ee" },
  frame_fire: { stops: "#f97316, #ef4444, #facc15, #f97316", glow: "#f97316" },
  frame_ice: { stops: "#bae6fd, #38bdf8, #e0f2fe, #bae6fd", glow: "#38bdf8" },
  frame_gold: { stops: "#fde68a, #f59e0b, #fde68a", glow: "#f59e0b" },
  frame_royal: { stops: "#7c3aed, #fbbf24, #7c3aed, #fbbf24", glow: "#a78bfa" },
  frame_emerald: { stops: "#065f46, #34d399, #a7f3d0, #34d399", glow: "#34d399" },
  frame_aurora: { stops: "#22d3ee, #a78bfa, #34d399, #22d3ee, #a78bfa", glow: "#a78bfa" },
  frame_diamond: { stops: "#ffffff, #7dd3fc, #ffffff, #c4b5fd, #ffffff", glow: "#7dd3fc" },
};

/** Style for the glowing, animated ring wrapped around a profile photo. */
export function frameStyle(id: string | null | undefined): CSSProperties | undefined {
  const f = id ? FRAME_COLORS[id] : undefined;
  if (!f) return undefined;
  return {
    background: `linear-gradient(120deg, ${f.stops})`,
    backgroundSize: "300% 300%",
    animation: `${ANIM}, pcGlow 2.4s ease-in-out infinite`,
    ["--glow" as string]: f.glow,
  } as CSSProperties;
}

/** Player-card colours that replace the rank colours. */
export const CARD_STYLE_THEME: Record<string, { a: string; b: string; text: string }> = {
  card_pitch: { a: "#4ade80", b: "#14532d", text: "#fff" },
  card_midnight: { a: "#475569", b: "#020617", text: "#fff" },
  card_inferno: { a: "#fb923c", b: "#7f1d1d", text: "#fff" },
  card_holo: { a: "#f0abfc", b: "#22d3ee", text: "#fff" },
  card_royal: { a: "#a78bfa", b: "#78350f", text: "#fff" },
  card_cyber: { a: "#22d3ee", b: "#064e3b", text: "#fff" },
};

/** Title text for a title item id (e.g. "🔥 Clutch King"). */
export const titleText = (id: string | null | undefined) => (id ? STAR_ITEMS.find((i) => i.id === id && i.slot === "title")?.name : undefined);

const NAME_BG: Record<string, string> = {
  name_gold: "linear-gradient(90deg, #fde68a, #f59e0b, #fde68a)",
  name_neon: "linear-gradient(90deg, #22d3ee, #34d399)",
  name_fire: "linear-gradient(90deg, #f97316, #ef4444)",
  name_rainbow: "linear-gradient(90deg, #f43f5e, #f59e0b, #22c55e, #38bdf8, #a855f7, #f43f5e)",
  name_neonpurple: "linear-gradient(90deg, #c084fc, #a855f7, #7c3aed, #d946ef, #c084fc)",
};

/** Style for a coloured player name. */
export function nameStyle(id: string | null | undefined): CSSProperties | undefined {
  const bg = id ? NAME_BG[id] : undefined;
  if (!bg) return undefined;
  const base: CSSProperties = { backgroundImage: bg, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" };
  if (id === "name_neonpurple") return { ...base, backgroundSize: "300% 100%", animation: ANIM, filter: "drop-shadow(0 0 6px #a855f7)" };
  return id === "name_rainbow" ? { ...base, backgroundSize: "300% 100%", animation: ANIM } : base;
}

const BANNER_BG: Record<string, string> = {
  banner_sunset: "linear-gradient(120deg, #f97316, #ec4899, #8b5cf6)",
  banner_pitch: "repeating-linear-gradient(90deg, #15803d 0 40px, #16a34a 40px 80px)",
  banner_midnight: "linear-gradient(180deg, #020617, #1e3a8a)",
  banner_aurora: "linear-gradient(120deg, #064e3b, #34d399, #6d28d9, #0f172a)",
  banner_neon: "linear-gradient(120deg, #22d3ee, #a855f7, #22d3ee, #a855f7)",
};

/** Style for a profile banner. */
export function bannerStyle(id: string | null | undefined): CSSProperties | undefined {
  const bg = id ? BANNER_BG[id] : undefined;
  if (!bg) return undefined;
  return id === "banner_neon" ? { background: bg, backgroundSize: "300% 300%", animation: ANIM } : { background: bg };
}

/** Weekly missions (reset every Monday). Progress is worked out on the server from real activity. */
export const MISSIONS = [
  { id: "play", title: "Play in 2 tournaments that start this week", goal: 2, reward: 5 },
  { id: "chal", title: "Win a 1v1 challenge", goal: 1, reward: 3 },
  { id: "days", title: "Open PlayConnect on 5 different days", goal: 5, reward: 4 },
] as const;

export interface MissionProgress {
  id: string;
  title: string;
  goal: number;
  reward: number;
  progress: number;
  done: boolean;
}
