"use client";

import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Check, Coins, Gift, Play, Trash2, Trophy, Users, X } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/providers/AuthProvider";
import {
  useApproveTournamentRequest,
  useDeleteTournament,
  useRejectTournamentRequest,
  useTournament,
  useToggleJoinTournament,
  useToggleWaitlist,
  useUpdateTournamentStatus,
} from "@/hooks/useTournaments";
import { useLiveAuthor } from "@/hooks/useProfile";
import { gameArt } from "@/lib/gameArt";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useGenerateBracket, useTournamentMatches } from "@/hooks/useBracket";
import { BracketView } from "@/components/tournaments/BracketView";
import { TournamentShots } from "@/components/tournaments/TournamentShots";
import { ShareButton } from "@/components/shared/ShareButton";
import { downloadIcs } from "@/lib/ics";
import { CreateTournamentDialog } from "@/components/tournaments/CreateTournamentDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { effectiveStatus } from "@/lib/tournamentStatus";
import { PrizePaidBadge } from "@/components/tournaments/PrizePaidBadge";
import { SharePlayerCardButton } from "@/components/shared/SharePlayerCardButton";
import { ShareResultButton } from "@/components/tournaments/ShareResultButton";
import { withNext } from "@/lib/nextUrl";
import { callStars, useStars } from "@/hooks/useStars";

export default function TournamentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const { data: tournament, isLoading } = useTournament(params.id);
  const { matches, loading: matchesLoading } = useTournamentMatches(params.id);
  const toggleJoin = useToggleJoinTournament();
  const queryClient = useQueryClient();
  const stars = useStars(profile?.uid);
  const [starsBusy, setStarsBusy] = useState(false);
  const [starsMsg, setStarsMsg] = useState<string | null>(null);
  const approveRequest = useApproveTournamentRequest();
  const rejectRequest = useRejectTournamentRequest();
  const generateBracket = useGenerateBracket(params.id);
  const deleteTournament = useDeleteTournament();
  const [startError, setStartError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const autoJoined = useRef(false);
  const { data: organiser } = useLiveAuthor(tournament?.organizerId);
  const updateStatus = useUpdateTournamentStatus();
  const toggleWaitlist = useToggleWaitlist();

  // Someone who signed up from this tournament's link (?join=1) is joined as soon as their account is ready.
  useEffect(() => {
    if (autoJoined.current || !profile || !tournament || matchesLoading) return;
    if (new URLSearchParams(window.location.search).get("join") !== "1") return;
    autoJoined.current = true;
    router.replace(pathname);
    const joined = tournament.participantIds.includes(profile.uid);
    const pending = !!tournament.pendingParticipantIds?.includes(profile.uid);
    const full = tournament.participantIds.length >= tournament.maxParticipants;
    if (joined || pending || full || matches.length > 0 || profile.uid === tournament.organizerId || tournament.entryType === "stars") return;
    toggleJoin.mutate({
      tournamentId: tournament.id,
      uid: profile.uid,
      currentlyJoined: false,
      currentlyPending: false,
      entryType: tournament.entryType,
    });
  }, [profile, tournament, matches, matchesLoading, pathname, router, toggleJoin]);

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;

  if (!tournament) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-steel/50">No tournament found.</p>
      </div>
    );
  }

  const isOrganizer = profile?.uid === tournament.organizerId;
  const isJoined = !!profile && tournament.participantIds.includes(profile.uid);
  const isPending = !!profile && tournament.pendingParticipantIds?.includes(profile.uid);
  const isFull = tournament.participantIds.length >= tournament.maxParticipants;
  const bracketStarted = matches.length > 0;
  const isPaid = tournament.entryType === "paid";
  const isStars = tournament.entryType === "stars";
  const starsFee = tournament.starsFee ?? 0;
  const myStars = stars.balance;
  const onWaitlist = !!profile && !!tournament.waitlistIds?.includes(profile.uid);

  async function handleStart() {
    if (!tournament) return;
    setStartError(null);
    try {
      await generateBracket.mutateAsync(tournament.participantIds);
    } catch (err) {
      setStartError((err as Error).message);
    }
  }

  async function handleDelete() {
    if (!tournament) return;
    setDeleteError(null);
    try {
      await deleteTournament.mutateAsync(tournament.id);
      router.push("/tournaments");
    } catch (err) {
      setDeleteError(
        (err as Error).message?.includes("permission")
          ? "Permission denied — check that Firestore rules have been re-published in Firebase Console."
          : (err as Error).message || "Couldn't delete this tournament."
      );
      setConfirmingDelete(false);
    }
  }

  async function handleStarsJoin() {
    if (!tournament || !profile) return;
    if (isJoined && !confirm(`Leave this tournament? You'll get your ${starsFee} PlayCoins back.`)) return;
    if (!isJoined && myStars < starsFee) {
      setStarsMsg(`You need ${starsFee - myStars} more PlayCoins to join. Earn PlayCoins by playing, then come back.`);
      return;
    }
    setStarsBusy(true);
    setStarsMsg(null);
    let r: { ok: boolean; error?: string };
    try {
      r = await callStars({ action: isJoined ? "leaveTournament" : "joinTournament", tournamentId: tournament.id });
    } catch {
      r = { ok: false, error: "Something went wrong. Try again." };
    } finally {
      setStarsBusy(false);
    }
    if (!r.ok) setStarsMsg(r.error ?? "That didn't work. Try again.");
    else queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "tournaments" || q.queryKey[0] === "tournament" });
  }

  function joinButtonLabel() {
    if (isJoined) return "Joined";
    if (isPending) return "Request pending";
    if (isFull) return "Full";
    if (isStars) return `Join · ${starsFee} 🪙`;
    return isPaid ? "Request to join" : "Join";
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="relative -mx-5 -mt-5 mb-4 h-28 overflow-hidden rounded-t-2xl bg-brand-gradient">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gameArt(tournament.game, tournament.title)} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-2 left-4 text-[11px] font-semibold uppercase tracking-wide text-white/90">
            {tournament.game}
          </span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-violet-glow" />
              <h1 className="font-display text-lg font-bold text-foreground">{tournament.title}</h1>
            </div>
            <p className="mt-1 text-sm text-steel/50">{tournament.game}</p>
            <Link
              href={organiser ? `/profile/${organiser.username}` : "#"}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-muted py-1 pl-1 pr-3"
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={organiser?.photoURL ?? undefined} alt="" />
                <AvatarFallback className="text-[10px]">{(organiser?.displayName ?? "?")[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-steel/60">
                Organised by <strong className="font-semibold text-foreground">{isOrganizer ? "you" : organiser?.displayName ?? "…"}</strong>{organiser?.verified && <VerifiedBadge className="ml-1" size={12} />}
              </span>
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-steel/50">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {tournament.startsAt ? format(tournament.startsAt.toDate(), "MMM d, h:mm a") : "TBD"}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {tournament.participantIds.length}/{tournament.maxParticipants} joined
              </span>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-medium capitalize">
                {effectiveStatus(tournament)}
              </span>
              <span
                className={
                  isPaid
                    ? "flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-medium text-steel/70"
                    : "flex items-center gap-1 rounded-full border border-signal-green/30 bg-signal-green/10 px-2 py-0.5 font-medium text-signal-green"
                }
              >
                <Coins className="h-3 w-3" />
                {isStars ? `${starsFee} 🪙 PlayCoins entry` : isPaid ? `Paid · ${tournament.entryFee}` : "Free entry"}
              </span>
              {tournament.prize && (
                <span className="flex items-center gap-1 rounded-full border border-violet/30 bg-violet/10 px-2 py-0.5 font-medium text-violet-glow">
                  <Gift className="h-3 w-3" />
                  {tournament.prize}
                </span>
              )}
            </div>
          </div>

          {!isOrganizer && profile && !bracketStarted && (
            <Button
              variant={isJoined || isPending ? "outline" : "default"}
              disabled={toggleJoin.isPending || (!isJoined && !isPending && isFull)}
              onClick={() =>
                isStars
                  ? handleStarsJoin()
                  : toggleJoin.mutate({
                      tournamentId: tournament.id,
                      uid: profile.uid,
                      currentlyJoined: isJoined,
                      currentlyPending: isPending,
                      entryType: tournament.entryType,
                    })
              }
            >
              {isStars && starsBusy ? "Please wait…" : isStars && isJoined ? "Joined · tap to leave" : joinButtonLabel()}
            </Button>
          )}
          {!isOrganizer && profile && isJoined && bracketStarted && (
            <p className="w-full text-xs text-steel/60">The bracket has started, so you can&apos;t leave this tournament now.</p>
          )}
          {isStars && isOrganizer && (
            <p className="w-full text-xs text-steel/60">
              {bracketStarted
                ? <>Entry fees are paid into your <Link href="/stars" className="text-violet-glow underline">PlayCoins</Link> when the bracket starts — check your history.</>
                : <>Players pay {starsFee} 🪙 each. The fees ({(tournament.participantIds?.length ?? 0)} joined so far) are held safely and paid into your PlayCoins the moment you start the bracket. If you delete the tournament first, everyone is refunded.</>}
            </p>
          )}
          {isStars && profile && !isOrganizer && !bracketStarted && (
            <p className="w-full text-xs text-steel/60">
              You have <span className="font-semibold text-foreground">{myStars} 🪙</span>.{" "}
              <Link href="/stars" className="text-violet-glow underline">PlayCoins</Link>
              {starsMsg && <span className="ml-1 text-signal-red">{starsMsg}</span>}
            </p>
          )}
          {!profile && !bracketStarted && (
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <Link href={withNext("/signup", `${pathname}?join=1`)}>
                <Button className="w-full" disabled={isFull}>{isFull ? "Full" : "Sign up to join"}</Button>
              </Link>
              <Link href={withNext("/login", `${pathname}?join=1`)} className="text-center text-xs text-violet-glow hover:underline">
                I already have an account
              </Link>
            </div>
          )}
          {!isOrganizer && profile && !bracketStarted && isFull && !isJoined && !isPending && effectiveStatus(tournament) !== "completed" && (
            <Button
              variant={onWaitlist ? "outline" : "default"}
              disabled={toggleWaitlist.isPending}
              onClick={() => toggleWaitlist.mutate({ tournamentId: tournament.id, uid: profile.uid, onList: onWaitlist })}
            >
              {onWaitlist ? "On the list ✓" : "Notify me"}
            </Button>
          )}
          {toggleJoin.isError && <p className="text-xs text-signal-red">{(toggleJoin.error as Error)?.message?.startsWith("The bracket") ? (toggleJoin.error as Error).message : "Couldn't update your spot. Check your connection and try again."}</p>}

          {isOrganizer && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={effectiveStatus(tournament)}
                onChange={(e) => updateStatus.mutate({ tournamentId: tournament.id, status: e.target.value as typeof tournament.status })}
                disabled={updateStatus.isPending}
                className="rounded-full border border-border bg-muted px-2.5 py-1.5 text-xs font-medium capitalize text-foreground"
                aria-label="Tournament status"
              >
                {(["upcoming", "live", "completed"] as const).map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              {!bracketStarted && (
                <Button onClick={handleStart} disabled={generateBracket.isPending || tournament.participantIds.length < 2}>
                  <Play className="h-4 w-4" />
                  {generateBracket.isPending ? "Building bracket…" : "Start bracket"}
                </Button>
              )}
              {confirmingDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-steel/50">Delete?</span>
                  <Button size="sm" variant="destructive" disabled={deleteTournament.isPending} onClick={handleDelete}>
                    {deleteTournament.isPending ? "Deleting…" : "Yes"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(false)}>
                    No
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-lg p-2 text-steel/40 hover:bg-signal-red/10 hover:text-signal-red"
                  title="Delete tournament"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {tournament.description && (
          <p className="mt-3 text-sm leading-relaxed text-steel/70">{tournament.description}</p>
        )}

        <PrizePaidBadge tournament={tournament} isOrganizer={isOrganizer} />

        {profile && tournament.status === "completed" && tournament.winnerId === profile.uid && (
          <div className="mt-4 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-4">
            <p className="text-sm font-bold text-foreground">🏆 You won this tournament!</p>
            <p className="mb-3 text-xs text-steel/60">Share your player card and show everyone.</p>
            <SharePlayerCardButton
              profile={profile}
              tournamentTitle={tournament.title}
              game={tournament.game}
              className="border-0 bg-yellow-400 text-black"
              secondaryClassName="border-yellow-500 text-yellow-700 dark:text-yellow-300"
              label="Share your player card"
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ShareButton
            path={`/tournaments/${tournament.id}`}
            title={tournament.title}
            text={`🏆 ${tournament.title} — ${tournament.game}${tournament.prize ? ` · Prize: ${tournament.prize}` : ""}. Join me on PlayConnect!`}
          />
          <ShareResultButton tournament={tournament} matches={matches} />
          {effectiveStatus(tournament) === "upcoming" && tournament.startsAt && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                downloadIcs({
                  title: `${tournament.title} (${tournament.game})`,
                  description: tournament.description || `PlayConnect tournament · ${tournament.game}`,
                  start: tournament.startsAt.toDate(),
                  url: `${window.location.origin}/tournaments/${tournament.id}`,
                })
              }
            >
              <CalendarDays className="h-3.5 w-3.5" /> Add to calendar
            </Button>
          )}
          {isOrganizer && (
            <CreateTournamentDialog
              variant="outline"
              label="Run again"
              initial={{
                title: tournament.title,
                game: tournament.game,
                description: tournament.description,
                format: tournament.format,
                maxParticipants: tournament.maxParticipants,
                entryType: tournament.entryType,
                entryFee: tournament.entryFee,
                prize: tournament.prize,
              }}
            />
          )}
        </div>

        {isOrganizer && !bracketStarted && (
          <p className="mt-3 text-xs text-steel/40">
            Once you start the bracket, matchups are locked in — new joins won&apos;t be added to this tournament anymore.
          </p>
        )}
        {startError && <p className="mt-2 text-sm text-signal-red">{startError}</p>}
        {deleteError && <p className="mt-2 text-sm text-signal-red">{deleteError}</p>}
      </Card>

      {isOrganizer && isPaid && tournament.pendingParticipantIds?.length > 0 && !bracketStarted && (
        <Card className="p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel/50">
            Join requests ({tournament.pendingParticipantIds.length})
          </h3>
          <div className="flex flex-col gap-2">
            {tournament.pendingParticipantIds.map((uid) => (
              <div key={uid} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-xs text-steel/60">Player {uid.slice(0, 8)}…</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => approveRequest.mutate({ tournamentId: tournament.id, uid })}
                    disabled={approveRequest.isPending || tournament.participantIds.length >= tournament.maxParticipants}
                    className="rounded-lg bg-signal-green/15 p-1.5 text-signal-green hover:bg-signal-green/25"
                    title="Approve"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => rejectRequest.mutate({ tournamentId: tournament.id, uid })}
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

      {!bracketStarted && !matchesLoading && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Trophy className="mx-auto h-8 w-8 text-steel/30" />
          <p className="mt-3 text-sm text-steel/50">
            {isOrganizer
              ? "Start the bracket once enough players have joined."
              : "The organizer hasn't started the bracket yet."}
          </p>
        </div>
      )}

      {bracketStarted && (
        <BracketView
          matches={matches}
          tournamentId={tournament.id}
          tournamentTitle={tournament.title}
          format={tournament.format}
          game={tournament.game}
          organizerId={tournament.organizerId}
          viewerUid={profile?.uid}
        />
      )}

      <TournamentShots
        tournamentId={tournament.id}
        organizerId={tournament.organizerId}
        participantIds={tournament.participantIds ?? []}
      />
    </div>
  );
}
