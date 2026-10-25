"use client";

import { ImageIcon } from "lucide-react";
import type { Tournament, TournamentMatch } from "@/types";
import { Button } from "@/components/ui/button";
import { shareResultImage } from "@/lib/resultImage";

/** "Share result": a picture of the champion and final score, ready for a WhatsApp status. */
export function ShareResultButton({ tournament, matches }: { tournament: Tournament; matches: TournamentMatch[] }) {
  const final = matches.find((m) => !m.nextMatchId && m.winnerId);
  if (tournament.status !== "completed" || !final) return null;

  const p1Won = final.winnerId === final.player1Id;
  const winner = (p1Won ? final.player1 : final.player2)?.displayName ?? "Champion";
  const runnerUp = (p1Won ? final.player2 : final.player1)?.displayName;
  const s1 = final.player1Score ?? 0;
  const s2 = final.player2Score ?? 0;
  const score = p1Won ? `${s1}-${s2}` : `${s2}-${s1}`;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => shareResultImage({ title: tournament.title, game: tournament.game, winner, runnerUp, score, prize: tournament.prize })}
    >
      <ImageIcon className="h-3.5 w-3.5" /> Share result
    </Button>
  );
}
