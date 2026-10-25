"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { CalendarClock, Check, Coins, Gamepad2, Gift, Play, Trash2, Trophy, Users, X } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import {
  useApproveLeagueRequest,
  useDeleteLeague,
  useJoinLeague,
  useLeague,
  useLeagueMatches,
  useLeagueTeams,
  useRejectLeagueRequest,
  useStartLeague,
} from "@/hooks/useLeagues";
import { StandingsTable } from "@/components/leagues/StandingsTable";
import { LeagueFixtureCard } from "@/components/leagues/LeagueFixtureCard";
import { LeaguePendingResults } from "@/components/leagues/LeaguePendingResults";
import { useLeagueResults } from "@/hooks/useLeagueResults";
import { ShareButton } from "@/components/shared/ShareButton";
import { shareStandingsImage } from "@/lib/standingsImage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LeagueDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: league, isLoading: leagueLoading } = useLeague(params.id);
  const { data: teams, isLoading: teamsLoading } = useLeagueTeams(params.id);
  const { data: matches } = useLeagueMatches(params.id);
  const results = useLeagueResults(params.id);
  const joinLeague = useJoinLeague(params.id);
  const approveRequest = useApproveLeagueRequest(params.id);
  const rejectRequest = useRejectLeagueRequest(params.id);
  const startLeague = useStartLeague(params.id);
  const deleteLeague = useDeleteLeague();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [approvingUid, setApprovingUid] = useState<string | null>(null);

  const myTeam = teams?.find((t) => profile && t.memberIds.includes(profile.uid));
  const isCreator = !!profile && !!league && profile.uid === league.creatorId;
  const isPending = !!profile && league?.pendingParticipantIds?.includes(profile.uid);

  async function handleJoin() {
    if (!profile) return;
    await joinLeague.mutateAsync({
      uid: profile.uid,
      username: profile.username,
      displayName: profile.displayName,
      photoURL: profile.photoURL,
    });
  }

  async function handleApprove(uid: string) {
    setApprovingUid(uid);
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) return;
      const d = snap.data();
      await approveRequest.mutateAsync({ uid, username: d.username, displayName: d.displayName, photoURL: d.photoURL });
    } catch {
      // approval failed (e.g. rules not republished) — button re-enables so you can retry
    } finally {
      setApprovingUid(null);
    }
  }

  async function handleStart() {
    setStartError(null);
    try {
      await startLeague.mutateAsync();
    } catch (err) {
      setStartError((err as Error).message || "Couldn't start the league.");
    }
  }

  async function handleDelete() {
    if (!league) return;
    setDeleteError(null);
    try {
      await deleteLeague.mutateAsync(league.id);
      router.push("/leagues");
    } catch (err) {
      setDeleteError(
        (err as Error).message?.includes("permission")
          ? "Permission denied — check that Firestore rules have been re-published in Firebase Console."
          : (err as Error).message || "Couldn't delete this league."
      );
      setConfirmingDelete(false);
    }
  }

  if (leagueLoading || teamsLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  }

  if (!league) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-steel/50">No league found.</p>
      </div>
    );
  }

  const isFull = (teams?.length ?? 0) >= league.maxParticipants;
  const isPaid = league.entryType === "paid";
  const matchesByRound = new Map<number, typeof matches>();
  matches?.forEach((m) => {
    const list = matchesByRound.get(m.round) ?? [];
    list.push(m);
    matchesByRound.set(m.round, list);
  });

  function joinButtonLabel() {
    if (myTeam) return "You're in";
    if (isPending) return "Request pending";
    if (isFull) return "Full";
    return isPaid ? "Request to join" : "Join league";
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">{league.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-steel/50">
              <Gamepad2 className="h-3.5 w-3.5" /> {league.game}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-steel/50">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {league.teamsCount}/{league.maxParticipants} joined
              </span>
              {league.started && (
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> {matches?.filter((m) => m.played).length ?? 0}/{league.matchesCount} played
                </span>
              )}
              <span
                className={
                  isPaid
                    ? "flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-medium text-amber-400"
                    : "flex items-center gap-1 rounded-full border border-signal-green/30 bg-signal-green/10 px-2 py-0.5 font-medium text-signal-green"
                }
              >
                <Coins className="h-3 w-3" />
                {isPaid ? `Paid · ${league.entryFee}` : "Free entry"}
              </span>
              {league.prize && (
                <span className="flex items-center gap-1 rounded-full border border-violet/30 bg-violet/10 px-2 py-0.5 font-medium text-violet-glow">
                  <Gift className="h-3 w-3" />
                  {league.prize}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {profile && !myTeam && !league.started && (
              <Button
                size="sm"
                onClick={handleJoin}
                disabled={joinLeague.isPending || isPending || (isFull && !isPending)}
                variant={isPending ? "outline" : "default"}
              >
                {joinLeague.isPending ? "Joining…" : joinButtonLabel()}
              </Button>
            )}
            {myTeam && !league.started && (
              <span className="rounded-full border border-violet/30 bg-violet/10 px-3 py-1.5 text-xs font-semibold text-violet-glow">
                You&apos;re in
              </span>
            )}

            {isCreator && !league.started && (
              <Button size="sm" onClick={handleStart} disabled={startLeague.isPending || (teams?.length ?? 0) < 2}>
                <Play className="h-3.5 w-3.5" />
                {startLeague.isPending ? "Generating schedule…" : "Start league"}
              </Button>
            )}

            {isCreator && (
              confirmingDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-steel/50">Delete?</span>
                  <Button size="sm" variant="destructive" disabled={deleteLeague.isPending} onClick={handleDelete}>
                    {deleteLeague.isPending ? "Deleting…" : "Yes"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(false)}>
                    No
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-lg p-2 text-steel/40 hover:bg-signal-red/10 hover:text-signal-red"
                  title="Delete league"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            )}
          </div>
        </div>

        {league.description && <p className="mt-3 text-sm leading-relaxed text-steel/70">{league.description}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ShareButton
            path={`/leagues/${league.id}`}
            title={league.name}
            text={`⚽ ${league.name} — ${league.game} league${league.prize ? ` · Prize: ${league.prize}` : ""}. Join me on PlayConnect!`}
          />
          {league.started && teams && teams.length > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={() => shareStandingsImage(league.name, league.game, teams)}>
              Share table as picture
            </Button>
          )}
        </div>

        {!league.started && (
          <p className="mt-3 text-xs text-steel/40">
            Once you start the league, every participant plays every other participant twice (home and away) —{" "}
            {league.maxParticipants * (league.maxParticipants - 1)} matches total, fully scheduled automatically.
          </p>
        )}
        {joinLeague.isError && <p className="mt-2 text-sm text-signal-red">{(joinLeague.error as Error).message}</p>}
        {startError && <p className="mt-2 text-sm text-signal-red">{startError}</p>}
        {deleteError && <p className="mt-2 text-sm text-signal-red">{deleteError}</p>}
      </Card>

      {isCreator && isPaid && league.pendingParticipantIds?.length > 0 && !league.started && (
        <Card className="p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel/50">
            Join requests ({league.pendingParticipantIds.length})
          </h3>
          <div className="flex flex-col gap-2">
            {league.pendingParticipantIds.map((uid) => (
              <div key={uid} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-xs text-steel/60">Player {uid.slice(0, 8)}…</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleApprove(uid)}
                    disabled={approvingUid === uid || (teams?.length ?? 0) >= league.maxParticipants}
                    className="rounded-lg bg-signal-green/15 p-1.5 text-signal-green hover:bg-signal-green/25"
                    title="Approve"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => rejectRequest.mutate(uid)}
                    disabled={rejectRequest.isPending}
                    className="rounded-lg bg-signal-red/15 p-1.5 text-signal-red hover:bg-signal-red/25"
                    title="Reject"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wide text-steel/50">Standings</h2>
      {teams && teams.length > 0 ? (
        <StandingsTable teams={teams} />
      ) : (
        <p className="text-sm text-steel/40">No one has joined yet.</p>
      )}

      {league.started && (
        <>
          {isCreator && <LeaguePendingResults leagueId={params.id} results={results} matches={matches ?? []} teams={teams ?? []} />}
          <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-steel/50">Fixtures</h2>
          {!matches || matches.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Trophy className="mx-auto h-6 w-6 text-steel/30" />
              <p className="mt-2 text-sm text-steel/50">No fixtures generated.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {Array.from(matchesByRound.entries())
                .sort(([a], [b]) => a - b)
                .map(([round, roundMatches]) => (
                  <div key={round} className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-steel/40">Matchday {round}</p>
                    {roundMatches?.map((m) => (
                      <LeagueFixtureCard key={m.id} leagueId={params.id} match={m} canReport={isCreator} creatorId={league.creatorId} teams={teams ?? []} results={results} />
                    ))}
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
