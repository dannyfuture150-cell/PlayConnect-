import { computeRank, withRankOverride } from "@/lib/rank";
import type { UserProfile } from "@/types";

type Theme = { a: string; b: string; c: string; text: string };
const THEMES: Record<string, Theme> = {
  Rookie: { a: "#b87333", b: "#7a4a1d", c: "#f3c9a0", text: "#fff" },
  Amateur: { a: "#d4d4d8", b: "#71717a", c: "#fafafa", text: "#fff" },
  Pro: { a: "#fde68a", b: "#b45309", c: "#fffbeb", text: "#fff" },
  Elite: { a: "#67e8f9", b: "#7c3aed", c: "#ecfeff", text: "#fff" },
  Legend: { a: "#f0abfc", b: "#fbbf24", c: "#ffffff", text: "#fff" },
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Draws an eFootball-style player card (1080x1720) for a PlayConnect profile. */
export async function drawPlayerCard(
  profile: Pick<UserProfile, "displayName" | "username" | "photoURL" | "followersCount" | "postsCount" | "tournamentWins" | "badges" | "rankOverride">,
  extra?: { tournamentTitle?: string; game?: string; headline?: string }
): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1720;
  const wins = Math.max(profile.tournamentWins ?? 0, extra?.tournamentTitle ? 1 : 0);
  const rank = withRankOverride(computeRank(profile.followersCount ?? 0, profile.postsCount ?? 0, wins), profile.rankOverride);
  const th = THEMES[rank.skillLevel] ?? THEMES.Rookie;

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;

  // Card body
  const body = g.createLinearGradient(0, 0, W, H);
  body.addColorStop(0, "#2a0a4d"); body.addColorStop(0.5, "#12031f"); body.addColorStop(1, "#3b0764");
  g.fillStyle = "#0b0214"; g.fillRect(0, 0, W, H);
  g.save();
  rr(g, 30, 30, W - 60, H - 60, 70); g.clip();
  g.fillStyle = body; g.fillRect(0, 0, W, H);
  // light streaks
  g.globalAlpha = 0.16;
  for (let i = 0; i < 6; i++) {
    const sg = g.createLinearGradient(0, 0, 400, 0);
    sg.addColorStop(0, "transparent"); sg.addColorStop(0.5, th.a); sg.addColorStop(1, "transparent");
    g.save(); g.translate(120 + i * 190, 0); g.rotate(0.35); g.fillStyle = sg; g.fillRect(-60, -200, 120, H + 600); g.restore();
  }
  g.globalAlpha = 1;
  // Full-card player photo
  const img = profile.photoURL ? await loadImage(profile.photoURL) : null;
  if (img) {
    const s2 = Math.max(W / img.width, H / img.height);
    const dw = img.width * s2, dh = img.height * s2;
    g.drawImage(img, (W - dw) / 2, -(dh - H) * 0.25, dw, dh);
  } else {
    const pg = g.createLinearGradient(0, 0, W, H);
    pg.addColorStop(0, "#a855f7"); pg.addColorStop(1, "#ec4899");
    g.fillStyle = pg; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(255,255,255,.9)"; g.textAlign = "center"; g.font = "900 760px sans-serif";
    g.fillText((profile.displayName?.[0] ?? "P").toUpperCase(), W / 2, 880);
  }
  // fade to dark at the bottom (for the text) and slightly at the top
  const fb = g.createLinearGradient(0, 760, 0, H);
  fb.addColorStop(0, "rgba(10,2,22,0)"); fb.addColorStop(0.35, "rgba(10,2,22,.82)"); fb.addColorStop(1, "rgba(10,2,22,.97)");
  g.fillStyle = fb; g.fillRect(0, 760, W, H - 760);
  const ft = g.createLinearGradient(0, 0, 0, 340);
  ft.addColorStop(0, "rgba(10,2,22,.75)"); ft.addColorStop(1, "rgba(10,2,22,0)");
  g.fillStyle = ft; g.fillRect(0, 0, W, 340);
  g.restore();

  // Metallic border
  const bd = g.createLinearGradient(0, 0, W, H);
  bd.addColorStop(0, th.c); bd.addColorStop(0.3, th.a); bd.addColorStop(0.7, th.b); bd.addColorStop(1, th.a);
  g.lineWidth = 14; g.strokeStyle = bd; rr(g, 30, 30, W - 60, H - 60, 70); g.stroke();
  g.lineWidth = 3; g.strokeStyle = "rgba(255,255,255,0.35)"; rr(g, 52, 52, W - 104, H - 104, 54); g.stroke();

  // Top row: rank + brand
  g.textAlign = "left";
  const rankText = rank.skillLevel.toUpperCase();
  g.font = "900 46px sans-serif";
  const rw = g.measureText(rankText).width + 64;
  const rgn = g.createLinearGradient(100, 0, 100 + rw, 0);
  rgn.addColorStop(0, th.a); rgn.addColorStop(1, th.b);
  g.fillStyle = rgn; rr(g, 100, 100, rw, 78, 39); g.fill();
  g.fillStyle = "#1a0b2e"; g.fillText(rankText, 132, 154);
  g.textAlign = "right";
  g.fillStyle = "#fff"; g.font = "900 46px sans-serif"; g.fillText("PLAYCONNECT", W - 100, 130);
  g.fillStyle = th.a; g.font = "bold 28px sans-serif"; g.fillText("CONNECT · COMPETE · CONQUER", W - 100, 172);
  if (extra?.game) { g.fillStyle = "rgba(255,255,255,.85)"; g.font = "bold 34px sans-serif"; g.fillText(extra.game.slice(0, 18).toUpperCase(), W - 100, 232); }

  // Champion ribbon
  const ry = 965;
  const rg = g.createLinearGradient(100, 0, W - 100, 0);
  rg.addColorStop(0, th.b); rg.addColorStop(0.5, th.a); rg.addColorStop(1, th.b);
  g.fillStyle = rg; rr(g, 100, ry, W - 200, 78, 39); g.fill();
  g.textAlign = "center"; g.fillStyle = "#1a0b2e"; g.font = "900 38px sans-serif";
  let ribbon = (extra?.headline ?? (extra?.tournamentTitle ? `🏆 CHAMPION · ${extra.tournamentTitle}` : "🏆 TOURNAMENT PLAYER")).toUpperCase();
  const fits = () => g.measureText(ribbon + "…").width < W - 260;
  if (g.measureText(ribbon).width >= W - 260) {
    while (ribbon.length > 12 && !fits()) ribbon = ribbon.slice(0, -1);
    ribbon = ribbon.trimEnd() + "…";
  }
  g.fillText(ribbon, W / 2, ry + 52);

  // Name
  g.fillStyle = "#fff"; g.font = "900 96px 'Arial Black', Impact, sans-serif";
  let name = (profile.displayName || "Player");
  while (g.measureText(name).width > W - 200 && name.length > 3) name = name.slice(0, -1);
  g.fillText(name, W / 2, ry + 175);
  g.fillStyle = th.a; g.font = "bold 40px sans-serif"; g.fillText(`@${profile.username}`, W / 2, ry + 228);

  // Stats row
  const stats: [string, string][] = [
    [String(wins), "TOURNAMENT WINS"],
    [String(profile.followersCount ?? 0), "FOLLOWERS"],
    [String(rank.reputationScore), "REPUTATION"],
  ];
  const sy = ry + 270, sw = (W - 200) / 3;
  g.fillStyle = "rgba(255,255,255,0.08)"; rr(g, 100, sy, W - 200, 150, 28); g.fill();
  stats.forEach(([v, l], i) => {
    const x = 100 + sw * i + sw / 2;
    g.fillStyle = "#fff"; g.font = "900 68px sans-serif"; g.fillText(v, x, sy + 76);
    g.fillStyle = th.a; g.font = "bold 22px sans-serif"; g.fillText(l, x, sy + 118);
    if (i > 0) { g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(100 + sw * i, sy + 24, 2, 102); }
  });

  // Badges
  const badges = (profile.badges ?? []).slice(0, 3);
  if (badges.length) {
    g.font = "bold 28px sans-serif";
    const pad = 26, gap = 14;
    const maxW = (W - 200 - gap * (badges.length - 1)) / badges.length;
    const widths = badges.map((b) => Math.min(g.measureText(b).width + pad * 2, maxW));
    let x = (W - (widths.reduce((a, b) => a + b, 0) + gap * (badges.length - 1))) / 2;
    const by = sy + 175;
    badges.forEach((b, i) => {
      g.fillStyle = "rgba(255,255,255,0.12)"; rr(g, x, by, widths[i], 58, 29); g.fill();
      g.strokeStyle = th.a; g.lineWidth = 2; rr(g, x, by, widths[i], 58, 29); g.stroke();
      g.fillStyle = "#fff"; g.textAlign = "center";
      let t = b; while (g.measureText(t).width > widths[i] - pad * 2 && t.length > 4) t = t.slice(0, -1);
      g.fillText(t, x + widths[i] / 2, by + 39);
      x += widths[i] + gap;
    });
  }

  // Join button
  const jy = H - 225;
  const jg = g.createLinearGradient(0, 0, W, 0);
  jg.addColorStop(0, "#fde047"); jg.addColorStop(1, "#f59e0b");
  g.shadowColor = "rgba(250,204,21,.6)"; g.shadowBlur = 30;
  g.fillStyle = jg; rr(g, 160, jy, W - 320, 100, 50); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = "#1a0b2e"; g.textAlign = "center"; g.font = "900 46px sans-serif";
  g.fillText("JOIN PLAYCONNECT  ›", W / 2, jy + 65);
  g.fillStyle = "rgba(255,255,255,.7)"; g.font = "bold 28px sans-serif";
  g.fillText(`${location.host}/signup`, W / 2, jy + 150);
  return c;
}

/** Draws the card and returns it as a PNG file. */
export async function makePlayerCardFile(
  profile: Parameters<typeof drawPlayerCard>[0],
  extra?: { tournamentTitle?: string; game?: string; headline?: string }
): Promise<File | null> {
  const canvas = await drawPlayerCard(profile, extra);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return null;
  return new File([blob], `${profile.username || "player"}-card.png`, { type: "image/png" });
}

/** Builds the card and opens the phone's share sheet (or downloads it). The join link goes with the picture. */
export async function sharePlayerCard(
  profile: Parameters<typeof drawPlayerCard>[0],
  extra?: { tournamentTitle?: string; game?: string; headline?: string }
) {
  const file = await makePlayerCardFile(profile, extra);
  if (!file) return;
  const link = `${location.origin}/profile/${profile.username}`;
  const text = extra?.headline
    ? `${extra.headline} on PlayConnect! Think you can catch me? See my profile and join: ${link}`
    : extra?.tournamentTitle
    ? `🏆 I just won ${extra.tournamentTitle} on PlayConnect! Think you can beat me? See my profile and join: ${link}`
    : `This is my PlayConnect player card. See my profile and join me for tournaments: ${link}`;
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, title: "My PlayConnect card" });
      return;
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return; // person closed the share sheet
    // sharing wasn't allowed (e.g. the card took too long to build): fall back to saving it
  }
  try { await navigator.clipboard?.writeText(text); } catch { /* ignore */ }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
