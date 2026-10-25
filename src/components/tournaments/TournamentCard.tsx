"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, Coins, Gift, Trash2, Trophy, Users } from "lucide-react";
import { format } from "date-fns";
import type { Tournament } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useDeleteTournament, useToggleJoinTournament, useToggleWaitlist, useUpdateTournamentStatus } from "@/hooks/useTournaments";
import { cn } from "@/lib/utils";
import { effectiveStatus } from "@/lib/tournamentStatus";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FORMAT_LABEL: Record<Tournament["format"], string> = {
  single_elimination: "Single elimination",
  double_elimination: "Double elimination",
  round_robin: "Round robin",
};

const STATUS_OPTIONS: Tournament["status"][] = ["upcoming", "live", "completed"];

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const { profile } = useAuth();
  const toggleJoin = useToggleJoinTournament();
  const updateStatus = useUpdateTournamentStatus();
  const deleteTournament = useDeleteTournament();
  const toggleWaitlist = useToggleWaitlist();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isJoined = !!profile && tournament.participantIds?.includes(profile.uid);
  const isPending = !!profile && tournament.pendingParticipantIds?.includes(profile.uid);
  const isFull = tournament.participantIds.length >= tournament.maxParticipants;
  const isOrganizer = profile?.uid === tournament.organizerId;
  const isPaid = tournament.entryType === "paid";
  const onWaitlist = !!profile && !!tournament.waitlistIds?.includes(profile.uid);

  function joinLabel() {
    if (isJoined) return "Joined";
    if (isPending) return "Pending";
    if (isFull) return "Full";
    return isPaid ? "Request" : "Join";
  }

  const spotsLeft = Math.max(0, tournament.maxParticipants - tournament.participantIds.length);
  const fillPct = Math.min(100, Math.round((tournament.participantIds.length / Math.max(1, tournament.maxParticipants)) * 100));
  const status = effectiveStatus(tournament);
  const isLive = status === "live";

  const statusSelect = isOrganizer ? (
    <select
      value={status}
      onChange={(e) => updateStatus.mutate({ tournamentId: tournament.id, status: e.target.value as Tournament["status"] })}
      disabled={updateStatus.isPending}
      className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium capitalize text-foreground"
    >
      {STATUS_OPTIONS.map((st) => (
        <option key={st} value={st}>{st}</option>
      ))}
    </select>
  ) : (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
        isLive ? "bg-red-500/10 text-red-500" : "bg-muted text-steel/70"
      )}
    >
      {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
      {status}
    </span>
  );

  return (
    <Card className="overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-glow">{tournament.game}</p>
          <Link href={`/tournaments/${tournament.id}`} className="mt-0.5 block">
            <h3 className="font-display text-lg font-bold leading-tight text-foreground hover:underline">{tournament.title}</h3>
          </Link>
          <p className="mt-0.5 text-[11px] text-steel/50">{FORMAT_LABEL[tournament.format]}</p>
        </div>
        {statusSelect}
      </div>

      {tournament.description && <p className="mt-2 text-sm leading-relaxed text-steel/70">{tournament.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tournament.prize && (
          <span className="flex items-center gap-1 rounded-full bg-violet/10 px-2.5 py-1 text-[11px] font-semibold text-violet-glow">
            <Gift className="h-3 w-3" /> {tournament.prize}
          </span>
        )}
        <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-steel/70">
          <Coins className="h-3 w-3" />
          {isPaid ? `Entry ${tournament.entryFee ?? "fee"}` : "Free entry"}
        </span>
        {tournament.prizePaid && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <BadgeCheck className="h-3 w-3" /> Prize paid
          </span>
        )}
        <span className="flex items-center gap-1 text-[11px] text-steel/50">
          <CalendarDays className="h-3 w-3" />
          {tournament.startsAt ? format(tournament.startsAt.toDate(), "MMM d, h:mm a") : "TBD"}
        </span>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-steel/60">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {tournament.participantIds.length}/{tournament.maxParticipants} players
          </span>
          <span>{spotsLeft === 0 ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${fillPct}%` }} />
        </div>
      </div>

      <Link
        href={`/tournaments/${tournament.id}`}
        className="mt-3 flex items-center justify-between rounded-xl bg-violet/10 px-3.5 py-2.5 text-sm font-semibold text-violet-glow active:scale-[0.99]"
      >
        <span className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          {status === "completed" ? "See the final bracket" : "Check out the bracket"}
        </span>
        <ArrowRight className="h-4 w-4" />
      </Link>

      <div className="mt-3 flex items-center justify-end gap-2">
        {isOrganizer &&
          (confirmingDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-steel/50">Delete this?</span>
              <Button size="sm" variant="destructive" disabled={deleteTournament.isPending} onClick={() => deleteTournament.mutate(tournament.id)}>
                Yes
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(false)}>
                No
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-lg p-1.5 text-steel/40 hover:bg-signal-red/10 hover:text-signal-red"
              title="Delete tournament"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ))}
        {!isOrganizer && profile && isFull && !isJoined && !isPending && status !== "completed" && (
          <Button
            size="sm"
            variant={onWaitlist ? "outline" : "default"}
            disabled={toggleWaitlist.isPending}
            onClick={() => toggleWaitlist.mutate({ tournamentId: tournament.id, uid: profile.uid, onList: onWaitlist })}
          >
            {onWaitlist ? "On the list ✓" : "Notify me"}
          </Button>
        )}
        {!isOrganizer && profile && tournament.bracketStarted && isJoined && (
          <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-steel/70">In · bracket started</span>
        )}
        {!isOrganizer && profile && !tournament.bracketStarted && !(isFull && !isJoined && !isPending) && (
          <Button
            size="sm"
            variant={isJoined || isPending ? "outline" : "default"}
            disabled={toggleJoin.isPending || (!isJoined && !isPending && isFull)}
            onClick={() =>
              toggleJoin.mutate({
                tournamentId: tournament.id,
                uid: profile.uid,
                currentlyJoined: isJoined,
                currentlyPending: isPending,
                entryType: tournament.entryType,
              })
            }
          >
            {joinLabel()}
          </Button>
        )}
        {toggleJoin.isError && <p className="w-full text-xs text-signal-red">{(toggleJoin.error as Error)?.message?.startsWith("The bracket") ? (toggleJoin.error as Error).message : "Couldn't update your spot. Check your connection and try again."}</p>}
      </div>
    </Card>
  );
}
