import type { LeagueTeam } from "@/types";

/** Draws the league table as a picture and shares it (or downloads it). */
export async function shareStandingsImage(leagueName: string, game: string, teams: LeagueTeam[]) {
  const rows = [...teams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)).slice(0, 16);
  const W = 900, rowH = 56, headH = 190, footH = 70;
  const H = headH + rowH * (rows.length + 1) + footH;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1e1b4b"); bg.addColorStop(1, "#0f172a");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  g.fillStyle = "#a78bfa"; g.font = "bold 26px sans-serif"; g.fillText("PLAYCONNECT · LEAGUE TABLE", 40, 60);
  g.fillStyle = "#fff"; g.font = "bold 46px sans-serif"; g.fillText(leagueName.slice(0, 28), 40, 115);
  g.fillStyle = "#94a3b8"; g.font = "24px sans-serif"; g.fillText(game, 40, 155);

  const cols = { pos: 40, name: 100, p: 560, w: 620, d: 680, l: 740, gd: 800, pts: 860 };
  g.fillStyle = "#94a3b8"; g.font = "bold 20px sans-serif";
  const hy = headH + 34;
  g.fillText("#", cols.pos, hy); g.fillText("Player", cols.name, hy);
  g.textAlign = "right";
  [["P", cols.p], ["W", cols.w], ["D", cols.d], ["L", cols.l], ["GD", cols.gd], ["PTS", cols.pts]].forEach(([t, x]) => g.fillText(t as string, x as number + 30, hy));
  g.textAlign = "left";

  rows.forEach((t, i) => {
    const y = headH + rowH * (i + 1) + 34;
    if (i % 2 === 0) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(20, y - 36, W - 40, rowH); }
    const played = t.wins + t.draws + t.losses;
    const gd = t.goalsFor - t.goalsAgainst;
    g.fillStyle = i === 0 ? "#fbbf24" : "#fff"; g.font = "bold 24px sans-serif";
    g.fillText(String(i + 1), cols.pos, y);
    g.fillText(t.name.slice(0, 22), cols.name, y);
    g.font = "24px sans-serif"; g.textAlign = "right";
    [[played, cols.p], [t.wins, cols.w], [t.draws, cols.d], [t.losses, cols.l], [gd > 0 ? `+${gd}` : gd, cols.gd]].forEach(([v, x]) => g.fillText(String(v), (x as number) + 30, y));
    g.font = "bold 26px sans-serif"; g.fillText(String(t.points), cols.pts + 30, y);
    g.textAlign = "left";
  });

  g.fillStyle = "#94a3b8"; g.font = "22px sans-serif";
  g.fillText("Join the next one on PlayConnect", 40, H - 28);

  const blob: Blob | null = await new Promise((res) => c.toBlob(res, "image/png"));
  if (!blob) return;
  const file = new File([blob], `${leagueName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "league"}-table.png`, { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `${leagueName} table` });
      return;
    }
  } catch {
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
