import type { TournamentMatch } from "@/types";

/** Draws the bracket as a picture and shares it (or downloads it), for a WhatsApp status. */
export async function shareBracketImage(title: string, game: string, matches: TournamentMatch[]) {
  const real = matches.filter((m) => !m.isBye || m.player1 || m.player2);
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  if (!rounds.length) return;
  const byRound = (r: number) => matches.filter((m) => m.round === r).sort((a, b) => a.slot - b.slot);
  const firstCount = Math.min(16, byRound(rounds[0]).length);
  const colW = 300, gap = 30, boxH = 78, rowH = 100, headH = 170, footH = 70, pad = 40;
  const W = pad * 2 + rounds.length * colW + (rounds.length - 1) * gap;
  const H = headH + firstCount * rowH + footH;
  const c = document.createElement("canvas");
  c.width = Math.max(W, 720);
  c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, c.width, H);
  bg.addColorStop(0, "#1e1b4b"); bg.addColorStop(1, "#0f172a");
  g.fillStyle = bg; g.fillRect(0, 0, c.width, H);

  g.textAlign = "left";
  g.fillStyle = "#a78bfa"; g.font = "bold 24px sans-serif"; g.fillText("PLAYCONNECT · BRACKET", pad, 56);
  g.fillStyle = "#fff"; g.font = "bold 44px sans-serif"; g.fillText(title.slice(0, 32), pad, 108);
  g.fillStyle = "#94a3b8"; g.font = "24px sans-serif"; g.fillText(game, pad, 144);

  const total = rounds.length;
  const label = (r: number) => (r === total ? "Final" : r === total - 1 ? "Semifinals" : r === total - 2 ? "Quarterfinals" : `Round ${r}`);

  rounds.forEach((r, ri) => {
    const list = byRound(r).slice(0, Math.max(1, Math.pow(2, total - 1 - ri)));
    const x = pad + ri * (colW + gap);
    const span = (firstCount * rowH) / Math.max(1, list.length);
    g.fillStyle = "#c4b5fd"; g.font = "bold 20px sans-serif"; g.textAlign = "left";
    g.fillText(label(r).toUpperCase(), x, headH + 8);
    list.forEach((m, i) => {
      const cy = headH + 30 + span * i + span / 2 - 15;
      const y = cy - boxH / 2;
      g.fillStyle = "rgba(255,255,255,0.07)";
      g.fillRect(x, y, colW, boxH);
      ([[m.player1, m.player1Score, m.player1Id], [m.player2, m.player2Score, m.player2Id]] as const).forEach(([p, s, id], k) => {
        const won = !!m.winnerId && m.winnerId === id;
        g.fillStyle = won ? "#fbbf24" : p ? "#fff" : "#64748b";
        g.font = (won ? "bold " : "") + "22px sans-serif";
        g.textAlign = "left";
        g.fillText((p?.displayName ?? "TBD").slice(0, 18), x + 14, y + 30 + k * 34);
        if (s !== null && s !== undefined) { g.textAlign = "right"; g.fillText(String(s), x + colW - 14, y + 30 + k * 34); }
      });
    });
  });
  void real;

  g.textAlign = "left";
  g.fillStyle = "#94a3b8"; g.font = "22px sans-serif";
  g.fillText("Follow the action on PlayConnect", pad, H - 26);

  const blob: Blob | null = await new Promise((res) => c.toBlob(res, "image/png"));
  if (!blob) return;
  const file = new File([blob], `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "bracket"}-bracket.png`, { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `${title} bracket` });
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
