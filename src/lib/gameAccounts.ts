import type { GamingPlatform, UserProfile } from "@/types";

/** The games a player can connect their in-game account for. Add a row here to support another game. */
export interface GameAccountDef {
  key: "efootball" | "eafc" | "mk" | "bloodstrike";
  label: string; // shown to people
  idField: "efootballId" | "eaFcId" | "mkId" | "bloodStrikeId";
  platformField: "efootballPlatform" | "eaFcPlatform" | "mkPlatform" | "bloodStrikePlatform";
  idLabel: string;
  placeholder: string;
  /** Words that identify this game in a tournament's game name. */
  match: RegExp;
  /** Android app id, used to open the installed game. Null when there is no phone version we can open. */
  androidPackage: string | null;
  /** Where to get the game if it isn't installed. */
  playStoreUrl: string;
  iosStoreUrl: string;
}

export const GAME_ACCOUNTS: GameAccountDef[] = [
  { key: "efootball", label: "eFootball", idField: "efootballId", platformField: "efootballPlatform", idLabel: "Konami ID / username", placeholder: "e.g. 123-456-789", match: /e-?football|pes/i, androidPackage: "jp.konami.pesam", playStoreUrl: "https://play.google.com/store/apps/details?id=jp.konami.pesam", iosStoreUrl: "itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&q=efootball" },
  { key: "eafc", label: "EA FC", idField: "eaFcId", platformField: "eaFcPlatform", idLabel: "EA ID / gamertag", placeholder: "Your EA FC online name", match: /ea\s*fc|fc\s*2|fifa/i, androidPackage: "com.ea.gp.fifamobile", playStoreUrl: "https://play.google.com/store/apps/details?id=com.ea.gp.fifamobile", iosStoreUrl: "itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&q=ea+sports+fc+mobile" },
  { key: "mk", label: "Mortal Kombat", idField: "mkId", platformField: "mkPlatform", idLabel: "Online ID / gamertag", placeholder: "Your Mortal Kombat online name", match: /mortal|kombat|\bmk\b/i, androidPackage: null, playStoreUrl: "https://play.google.com/store/search?q=mortal%20kombat&c=apps", iosStoreUrl: "itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&q=mortal+kombat" },
  { key: "bloodstrike", label: "Blood Strike", idField: "bloodStrikeId", platformField: "bloodStrikePlatform", idLabel: "Player ID / nickname", placeholder: "Your Blood Strike ID", match: /blood\s*-?strike/i, androidPackage: "com.netease.newspike", playStoreUrl: "https://play.google.com/store/apps/details?id=com.netease.newspike", iosStoreUrl: "itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&q=blood+strike" },
];

export const GAME_PLATFORMS: GamingPlatform[] = ["PlayStation", "Xbox", "PC", "Mobile", "Switch"];

export interface ConnectedGame {
  def: GameAccountDef;
  id: string;
  platform: string | null;
}

/** The games this player has connected (has an ID for). */
export function connectedGames(p: Partial<UserProfile> | null | undefined): ConnectedGame[] {
  if (!p) return [];
  return GAME_ACCOUNTS.flatMap((def) => {
    const id = String((p as Record<string, unknown>)[def.idField] ?? "").trim();
    if (!id) return [];
    const platform = ((p as Record<string, unknown>)[def.platformField] as string | undefined) || p.platform || null;
    return [{ def, id, platform }];
  });
}

/** Which connectable game a tournament is for (null if it's some other game). */
export function gameForTournament(gameName: string | undefined): GameAccountDef | null {
  if (!gameName) return null;
  return GAME_ACCOUNTS.find((d) => d.match.test(gameName)) ?? null;
}

/** A link that opens the game on this phone, or its store page if it isn't installed. Null on desktop/console. */
export function launchUrl(def: GameAccountDef, userAgent: string): string | null {
  if (/android/i.test(userAgent)) {
    if (!def.androidPackage) return def.playStoreUrl;
    const fallback = encodeURIComponent(def.playStoreUrl);
    return `intent://#Intent;package=${def.androidPackage};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;S.browser_fallback_url=${fallback};end`;
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) return def.iosStoreUrl;
  return null;
}
