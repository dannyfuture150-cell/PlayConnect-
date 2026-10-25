const PHOTOS = ["/ads/ad-1.jpg", "/ads/ad-2.jpg", "/ads/ad-3.jpg"];

/** Picture for a tournament's game: football, fighting and shooter art, otherwise one of the photos (stable per title). */
export function gameArt(game: string | undefined, seed = ""): string {
  const g = (game ?? "").toLowerCase();
  if (/(efootball|e-football|fc ?2|fc ?\d|ea fc|fifa|pes|football|soccer|dream league)/.test(g)) return "/ads/game-football.jpg";
  if (/(mortal|tekken|street fighter|fighter|fighting|ufc|kombat)/.test(g)) return "/ads/game-fighting.jpg";
  if (/(call of duty|cod|warzone|pubg|free fire|apex|valorant|fortnite|counter|cs ?go|cs2|shooter)/.test(g)) return "/ads/game-shooter.jpg";
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PHOTOS[h % PHOTOS.length];
}
