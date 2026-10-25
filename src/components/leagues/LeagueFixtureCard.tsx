"use client";

import { useState } from "react";
import type { LeagueMatch, LeagueResult, LeagueTeam } from "@/types";
import { LeagueResultSubmit } from "@/components/leagues/LeagueResultSubmit";
import { useReportLeagueMatch } from "@/hooks/useLeagues";
import { useAuth } from "@/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LeagueFixtureCard({
  leagueId, match, canReport, creatorId, teams, results,
}: { leagueId: string; match: LeagueMatch; canReport: boolean; creatorId: string; teams: LeagueTeam[]; results: LeagueResult[] }) {
  const { profile } = useAuth();
  const reportMatch = useReportLeagueMatch(leagueId);
  const [homeScore, setHomeScore] = useState<number | null>(match.homeScore);
  const [awayScore, setAwayScore] = useState<number | null>(match.awayScore);
  const [error, setError] = useState<string | null>(null);
  const myTeamIds = teams.filter((t) => profile && t.memberIds.includes(profile.uid)).map((t) => t.id);
  const isMyFixture = myTeamIds.includes(match.homeTeamId) || myTeamIds.includes(match.awayTeamId);
  const myPending = results.some((r) => r.matchId === match.id && r.status === "pending" && r.submittedBy === profile?.uid);
  const myRejected = results.some((r) => r.matchId === match.id && r.status === "rejected" && r.submittedBy === profile?.uid);

  async function submit() {
    if (homeScore === null || awayScore === null || !profile) return;
    setError(null);
    try {
      await reportMatch.mutateAsync({ matchId: match.id, homeScore, awayScore, reportedBy: profile.uid });
    } catch (err) {
      setError((err as Error).message || "Couldn't save that result.");
    }
  }

  if (match.played) {
    return (
      <Card className="flex items-center justify-between p-3.5">
        <span className="flex-1 text-right text-sm font-medium text-foreground">{match.homeTeamName}</span>
        <span className="mx-4 rounded-lg bg-muted px-3 py-1 text-sm font-bold text-foreground">
          {match.homeScore} – {match.awayScore}
        </span>
        <span className="flex-1 text-sm font-medium text-foreground">{match.awayTeamName}</span>
      </Card>
    );
  }

  return (
    <Card className="flex items-center justify-between gap-2 p-3.5">
      <span className="flex-1 truncate text-right text-sm font-medium text-foreground">{match.homeTeamName}</span>
      {canReport ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            value={homeScore ?? ""}
            onChange={(e) => setHomeScore(Math.max(0, Number(e.target.value)))}
            className="h-8 w-12 px-1.5 text-center text-sm"
          />
          <span className="text-steel/40">–</span>
          <Input
            type="number"
            min={0}
            value={awayScore ?? ""}
            onChange={(e) => setAwayScore(Math.max(0, Number(e.target.value)))}
            className="h-8 w-12 px-1.5 text-center text-sm"
          />
        </div>
      ) : (
        <span className="rounded-lg bg-muted px-3 py-1 text-xs font-medium text-steel/50">vs</span>
      )}
      <span className="flex-1 truncate text-sm font-medium text-foreground">{match.awayTeamName}</span>

      {canReport && (
        <Button
          size="sm"
          className="shrink-0"
          disabled={homeScore === null || awayScore === null || reportMatch.isPending}
          onClick={submit}
        >
          {reportMatch.isPending ? "Saving…" : "Report"}
        </Button>
      )}
      {!canReport && isMyFixture && (myPending ? (
        <span className="shrink-0 text-[11px] font-medium text-violet-glow">Sent · waiting</span>
      ) : (
        <LeagueResultSubmit leagueId={leagueId} creatorId={creatorId} match={match} />
      ))}
      {!canReport && isMyFixture && myRejected && !myPending && (
        <p className="w-full text-center text-[10px] text-signal-red">Your last result was rejected — send it again</p>
      )}
      {error && <p className="w-full text-center text-xs text-signal-red">{error}</p>}
    </Card>
  );
}
