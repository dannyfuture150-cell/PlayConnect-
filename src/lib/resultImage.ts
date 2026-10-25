/** Draws the tournament result as a picture and shares it (or downloads it). */
export async function shareResultImage(input: {
  title: string;
  game: string;
  winner: string;
  runnerUp?: string;
  score?: string;
  prize?: string | null;
}) {
  const W = 1080, H = 1080;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#3b0764"); bg.addColorStop(1, "#1c0232");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.textAlign = "center";

  g.fillStyle = "#c4b5fd"; g.font = "bold 34px sans-serif"; g.fillText("PLAYCONNECT · CHAMPION", W / 2, 120);
  g.font = "200px sans-serif"; g.fillText("🏆", W / 2, 400);
  g.fillStyle = "#fff"; g.font = "bold 80px sans-serif";
  g.fillText(input.winner.slice(0, 20), W / 2, 540);
  g.fillStyle = "#fbbf24"; g.font = "bold 40px sans-serif"; g.fillText("is the champion!", W / 2, 600);

  g.fillStyle = "#fff"; g.font = "bold 52px sans-serif"; g.fillText(input.title.slice(0, 30), W / 2, 720);
  g.fillStyle = "#a1a1aa"; g.font = "34px sans-serif"; g.fillText(input.game, W / 2, 775);

  if (input.runnerUp && input.score) {
    g.fillStyle = "#e4e4e7"; g.font = "38px sans-serif";
    g.fillText(`Final: ${input.winner.slice(0, 14)} ${input.score} ${input.runnerUp.slice(0, 14)}`, W / 2, 850);
  }
  if (input.prize) {
    g.fillStyle = "#34d399"; g.font = "bold 40px sans-serif"; g.fillText(`Prize: ${input.prize.slice(0, 30)}`, W / 2, 920);
  }
  g.fillStyle = "#a78bfa"; g.font = "30px sans-serif"; g.fillText("Join the next one on PlayConnect", W / 2, 1020);

  const blob: Blob | null = await new Promise((res) => c.toBlob(res, "image/png"));
  if (!blob) return;
  const file = new File([blob], `${input.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "result"}-result.png`, { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `${input.title} result` });
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
