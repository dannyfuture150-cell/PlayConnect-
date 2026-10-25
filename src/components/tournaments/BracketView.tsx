"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, RotateCcw, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { MatchResult, PostAuthorSnapshot, TournamentMatch } from "@/types";
import { useTournamentResults } from "@/hooks/useMatchResults";
import { SubmitResultDialog } from "@/components/tournaments/SubmitResultDialog";
import { PendingResults } from "@/components/tournaments/PendingResults";
import { useReportBracketResult, useReverseBracketResult } from "@/hooks/useBracket";
import { useAuth } from "@/providers/AuthProvider";
import { VictoryCelebration } from "@/components/tournaments/VictoryCelebration";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PlayerRow({
  player,
  score,
  isWinner,
  editable,
  onScoreChange,
}: {
  player: TournamentMatch["player1"];
  score: number | null;
  isWinner: boolean;
  editable: boolean;
  onScoreChange?: (value: number) => void;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5", isWinner && "bg-violet/10")}>
      {player ? (
        <>
          <Link href={`/profile/${player.username}`} className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={player.photoURL ?? undefined} alt={player.displayName} />
              <AvatarFallback className="text-[10px]">{player.displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className={cn("flex-1 truncate text-xs", isWinner ? "font-semibold text-foreground" : "text-steel/70")}>
              {player.displayName}
            </span>
          </Link>
          {isWinner && <Crown className="h-3 w-3 shrink-0 text-violet-glow" />}
        </>
      ) : (
        <span className="flex-1 truncate text-xs italic text-steel/30">TBD</span>
      )}

      {editable ? (
        <Input
          type="number"
          min={0}
          value={score ?? ""}
          onChange={(e) => onScoreChange?.(Math.max(0, Number(e.target.value)))}
          className="h-7 w-12 px-1.5 text-center text-xs"
        />
      ) : (
        score !== null && <span className="w-6 shrink-0 text-center text-xs font-bold text-foreground">{score}</span>
      )}
    </div>
  );
}

function MatchCard({
  match,
  tournamentId,
  tournamentTitle,
  game,
  organizerId,
  canReport,
  canReverse,
  results,
  onWin,
}: {
  match: TournamentMatch;
  tournamentId: string;
  tournamentTitle: string;
  game: string;
  organizerId: string;
  canReport: boolean;
  canReverse: boolean;
  results: MatchResult[];
  onWin: (winner: PostAuthorSnapshot) => void;
}) {
  const { profile } = useAuth();
  const reportResult = useReportBracketResult(tournamentId, game, organizerId);
  const reverseResult = useReverseBracketResult(
    tournamentId,
    game,
    organizerId,
    profile ? { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL ?? null } : null
  );
  const [confirmingReverse, setConfirmingReverse] = useState(false);
  const [p1Score, setP1Score] = useState<number | null>(match.player1Score);
  const [p2Score, setP2Score] = useState<number | null>(match.player2Score);

  // After a reversal the score boxes start empty again, ready for the correct score.
  useEffect(() => {
    if (!match.winnerId) {
      setP1Score(match.player1Score);
      setP2Score(match.player2Score);
    }
  }, [match.winnerId, match.player1Score, match.player2Score]);

  const bothPlayersSet = !!match.player1Id && !!match.player2Id;
  const isDecided = !!match.winnerId;
  const editable = canReport && bothPlayersSet && !isDecided && !match.isBye;
  const isMyMatch = !!profile && (match.player1Id === profile.uid || match.player2Id === profile.uid);
  const canSubmit = !canReport && isMyMatch && bothPlayersSet && !isDecided && !match.isBye;
  const iWon = !!profile && isDecided && match.winnerId === profile.uid && !match.isBye;
  const opp = match.player1Id === profile?.uid ? match.player2 : match.player1;
  const myScore = match.player1Id === profile?.uid ? match.player1Score : match.player2Score;
  const oppScore = match.player1Id === profile?.uid ? match.player2Score : match.player1Score;
  const winText = `Just won ${myScore}–${oppScore} against ${opp?.displayName ?? "my opponent"} in ${tournamentTitle}! 🏆🔥`;
  const shot = results.filter((r) => r.matchId === match.id && r.status === "approved").pop()?.imageUrl ?? results.find((r) => r.matchId === match.id)?.imageUrl;
  const myPending = results.some((r) => r.matchId === match.id && r.status === "pending" && r.submittedBy === profile?.uid);
  const myRejected = results.some((r) => r.matchId === match.id && r.status === "rejected" && r.submittedBy === profile?.uid);

  async function submit() {
    if (p1Score === null || p2Score === null || p1Score === p2Score) return;
    if (reportResult.isPending) return;
    let result;
    try {
      result = await reportResult.mutateAsync({ matchId: match.id, player1Score: p1Score, player2Score: p2Score });
    } catch {
      return; // the error is shown under the score box
    }
    // Only celebrate for the person who actually won the final, and only
    // right when it happens — not on every later visit to an already-
    // decided bracket.
    if (result.isFinal && result.winner && result.winner.uid === profile?.uid) {
      onWin(result.winner);
    }
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card p-2">
      <PlayerRow
        player={match.player1}
        score={isDecided || match.isBye ? match.player1Score : p1Score}
        isWinner={match.winnerId === match.player1Id && !!match.player1Id}
        editable={editable}
        onScoreChange={setP1Score}
      />
      <div className="my-0.5 h-px bg-border" />
      <PlayerRow
        player={match.player2}
        score={isDecided || match.isBye ? match.player2Score : p2Score}
        isWinner={match.winnerId === match.player2Id && !!match.player2Id}
        editable={editable}
        onScoreChange={setP2Score}
      />

      {iWon && (
        <a
          href={`/feed?draft=${encodeURIComponent(winText)}&game=${encodeURIComponent(game)}${shot ? `&img=${encodeURIComponent(shot)}` : ""}`}
          className="mt-2 block rounded-lg bg-brand-gradient py-1.5 text-center text-[11px] font-semibold text-white"
        >
          Post your win 🏆
        </a>
      )}
      {match.isBye && <p className="mt-1.5 text-center text-[10px] text-steel/40">Bye — auto-advanced</p>}

      {editable && (
        <Button
          size="sm"
          className="mt-2 w-full"
          disabled={p1Score === null || p2Score === null || p1Score === p2Score || reportResult.isPending}
          onClick={submit}
        >
          {reportResult.isPending ? "Saving…" : "Report score"}
        </Button>
      )}
      {canSubmit && (myPending ? (
        <p className="mt-2 text-center text-[11px] font-medium text-violet-glow">Sent — waiting for the organiser</p>
      ) : (
        <>
          {myRejected && <p className="mt-2 text-center text-[10px] text-signal-red">Your last result was rejected — send it again</p>}
          <SubmitResultDialog match={match} tournamentId={tournamentId} tournamentTitle={tournamentTitle} organizerId={organizerId} />
        </>
      ))}
      {canReverse && isDecided && !match.isBye && (
        confirmingReverse ? (
          <div className="mt-2 rounded-lg border border-signal-red/30 bg-signal-red/5 p-2">
            <p className="text-[11px] text-steel/70">
              {!match.nextMatchId
                ? "Reverse the final? The champion loses this win and the tournament goes back to live."
                : "Reverse this score? The winner leaves the next round and the match can be scored again."}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={reverseResult.isPending}
                onClick={async () => {
                  try {
                    await reverseResult.mutateAsync({ matchId: match.id });
                    setConfirmingReverse(false);
                  } catch {
                    /* the reason is shown below */
                  }
                }}
              >
                {reverseResult.isPending ? "Reversing…" : "Yes, reverse"}
              </Button>
              <Button size="sm" variant="outline" disabled={reverseResult.isPending} onClick={() => { setConfirmingReverse(false); reverseResult.reset(); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReverse(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-[11px] font-medium text-steel/60 hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Reverse score
          </button>
        )
      )}
      {reverseResult.isError && (
        <p className="mt-1 text-center text-[10px] text-signal-red">
          {(reverseResult.error as Error)?.message || "Couldn't reverse this result."}
        </p>
      )}
      {reportResult.isError && (
        <p className="mt-1 text-center text-[10px] text-signal-red">
          Couldn&apos;t save the score — check your connection and try again.
        </p>
      )}
      {editable && p1Score !== null && p2Score !== null && p1Score === p2Score && (
        <p className="mt-1 text-center text-[10px] text-signal-red">Scores can&apos;t tie in a bracket</p>
      )}
    </div>
  );
}


const FORMAT_LABEL: Record<string, string> = {
  single_elimination: "Single elimination",
  double_elimination: "Double elimination",
  round_robin: "Round robin",
};

/** One small box on the poster-style bracket: two names, two scores. Tap to open the match. */
function MiniMatch({ match, onOpen }: { match: TournamentMatch; onOpen: () => void }) {
  const row = (player: TournamentMatch["player1"], score: number | null, won: boolean) => (
    <div className={cn("flex items-center justify-between gap-1 px-1.5 py-[3px] text-[10px] leading-tight", won ? "bg-white/20 font-bold text-white" : "text-white/70")}>
      <span className="truncate">{player ? player.displayName : match.isBye ? "BYE" : "—"}</span>
      {score !== null && <span className="shrink-0 font-bold text-white">{score}</span>}
    </div>
  );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-[96px] shrink-0 overflow-hidden rounded-[5px] border border-white/70 bg-white/10 text-left backdrop-blur-sm active:scale-95"
    >
      {row(match.player1, match.player1Score, !!match.winnerId && match.winnerId === match.player1Id)}
      <div className="h-px bg-white/40" />
      {row(match.player2, match.player2Score, !!match.winnerId && match.winnerId === match.player2Id)}
    </button>
  );
}

/** A column of matches, spaced so each one sits halfway between the two feeding it. Lines join pairs. */
function BoardColumn({ matches, side, onOpen }: { matches: TournamentMatch[]; side: "left" | "right"; onOpen: (m: TournamentMatch) => void }) {
  const out = side === "left" ? "-right-3" : "-left-3";
  const inn = side === "left" ? "-left-3" : "-right-3";
  return (
    <div className="flex flex-col">
      {matches.map((m, i) => (
        <div key={m.id} className="relative flex min-h-[58px] flex-1 items-center justify-center py-1.5">
          <span className={cn("absolute top-1/2 h-px w-3 bg-white/60", out)} />
          {m.round > 1 && <span className={cn("absolute top-1/2 h-px w-3 bg-white/60", inn)} />}
          {matches.length > 1 && (
            <span className={cn("absolute w-px bg-white/60", out, i % 2 === 0 ? "top-1/2 bottom-0" : "top-0 bottom-1/2")} />
          )}
          <MiniMatch match={m} onOpen={() => onOpen(m)} />
        </div>
      ))}
    </div>
  );
}

function BracketBoard({
  matches,
  rounds,
  title,
  format,
  game,
  champion,
  onOpen,
}: {
  matches: TournamentMatch[];
  rounds: number[];
  title: string;
  format: string;
  game: string;
  champion: PostAuthorSnapshot | null;
  onOpen: (m: TournamentMatch) => void;
}) {
  const total = rounds.length;
  const sorted = (r: number) => matches.filter((m) => m.round === r).sort((a, b) => a.slot - b.slot);
  const finalMatch = sorted(total)[0];
  const sideRounds = rounds.filter((r) => r < total);
  const left = sideRounds.map((r) => {
    const ms = sorted(r);
    return ms.slice(0, Math.ceil(ms.length / 2));
  });
  const right = sideRounds
    .map((r) => {
      const ms = sorted(r);
      return ms.slice(Math.ceil(ms.length / 2));
    })
    .reverse();

  return (
    <div className="relative -mx-4 overflow-hidden bg-[#07060b] md:mx-0 md:rounded-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_0%_30%,rgba(220,38,38,0.45),transparent_70%),radial-gradient(60%_70%_at_100%_80%,rgba(37,99,235,0.5),transparent_70%)]" />
      <div className="relative px-4 pt-5 text-center">
        <h2 className="font-display text-3xl font-extrabold uppercase italic leading-none tracking-wide text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.45)]">
          {title}
        </h2>
        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-white">
          {FORMAT_LABEL[format] ?? "Tournament"} bracket
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-white/50">{game}</p>
      </div>

      <div className="relative overflow-x-auto px-4 pb-6 pt-5 scrollbar-none">
        <div className="mx-auto flex w-max items-stretch gap-6">
          {left.map((ms, i) => (
            <BoardColumn key={`l${i}`} matches={ms} side="left" onOpen={onOpen} />
          ))}

          <div className="flex min-w-[110px] flex-col items-center justify-center gap-3">
            <Trophy className={cn("h-14 w-14", champion ? "text-yellow-400 drop-shadow-[0_0_14px_rgba(250,204,21,0.7)]" : "text-white/70")} />
            {finalMatch && (
              <div className="relative flex items-center justify-center">
                <span className="absolute -left-3 top-1/2 h-px w-3 bg-white/60" />
                <span className="absolute -right-3 top-1/2 h-px w-3 bg-white/60" />
                <MiniMatch match={finalMatch} onOpen={() => onOpen(finalMatch)} />
              </div>
            )}
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">Final</p>
            {champion && (
              <p className="flex max-w-[110px] items-center gap-1 text-center text-xs font-bold text-yellow-300">
                <Crown className="h-3 w-3 shrink-0" />
                <span className="truncate">{champion.displayName}</span>
              </p>
            )}
          </div>

          {right.map((ms, i) => (
            <BoardColumn key={`r${i}`} matches={ms} side="right" onOpen={onOpen} />
          ))}
        </div>
      </div>
      <p className="relative pb-3 text-center text-[10px] text-white/40">Tap a match to open it</p>
    </div>
  );
}

export function BracketView({
  matches,
  tournamentId,
  tournamentTitle,
  format,
  game,
  organizerId,
  viewerUid,
}: {
  matches: TournamentMatch[];
  tournamentId: string;
  tournamentTitle: string;
  format: string;
  game: string;
  organizerId: string;
  viewerUid: string | undefined;
}) {
  const router = useRouter();
  const results = useTournamentResults(tournamentId);
  const [celebrating, setCelebrating] = useState<PostAuthorSnapshot | null>(null);
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  const { profile: viewerProfile } = useAuth();
  const canReport = viewerUid === organizerId;
  const canReverse = canReport || viewerProfile?.isAdmin === true;
  const totalRounds = rounds.length;

  function roundLabel(round: number) {
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semifinals";
    if (round === totalRounds - 2) return "Quarterfinals";
    return `Round ${round}`;
  }

  const finalMatch = matches.find((m) => m.round === totalRounds);
  const champion =
    finalMatch?.winnerId
      ? finalMatch.player1?.uid === finalMatch.winnerId
        ? finalMatch.player1
        : finalMatch.player2
      : null;

  function handleDismissCelebration() {
    setCelebrating(null);
    router.push(`/leaderboard?game=${encodeURIComponent(game)}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {celebrating && (
        <VictoryCelebration
          winner={celebrating}
          tournamentTitle={tournamentTitle}
          game={game}
          onDismiss={handleDismissCelebration}
        />
      )}

      {canReport && (
        <PendingResults results={results} matches={matches} tournamentId={tournamentId} game={game} organizerId={organizerId} />
      )}

      <BracketBoard
        matches={matches}
        rounds={rounds}
        title={tournamentTitle}
        format={format}
        game={game}
        champion={champion}
        onOpen={(m) => setOpenMatchId(m.id)}
      />

      <Dialog open={!!openMatchId} onOpenChange={(o) => !o && setOpenMatchId(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[15rem] p-3">
          {(() => {
            const m = matches.find((x) => x.id === openMatchId);
            if (!m) return null;
            return (
              <>
                <DialogTitle className="mb-2 text-sm">{roundLabel(m.round)}</DialogTitle>
                <MatchCard
                  match={m}
                  tournamentId={tournamentId}
                  tournamentTitle={tournamentTitle}
                  game={game}
                  organizerId={organizerId}
                  canReport={canReport}
                  canReverse={canReverse}
                  results={results}
                  onWin={(w) => {
                    setOpenMatchId(null);
                    setCelebrating(w);
                  }}
                />
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
