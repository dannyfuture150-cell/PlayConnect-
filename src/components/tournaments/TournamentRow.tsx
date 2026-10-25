"use client";

import { LiveDot } from "@/components/shared/LiveDot";
import Link from "next/link";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { format } from "date-fns";
import { Check, Gift, Users } from "lucide-react";
import type { Tournament } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useLiveAuthor } from "@/hooks/useProfile";
import { effectiveStatus } from "@/lib/tournamentStatus";
import { gameArt } from "@/lib/gameArt";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

/** A tournament shown like a group in the Groups list: picture, name, who runs it, and live details. Tapping opens it. */
export function TournamentRow({ tournament: t }: { tournament: Tournament }) {
  const { profile } = useAuth();
  const { data: organiser } = useLiveAuthor(t.organizerId);
  const status = effectiveStatus(t);
  const live = status === "live";
  const joined = !!profile && t.participantIds?.includes(profile.uid);
  const mine = profile?.uid === t.organizerId;
  const full = t.participantIds.length >= t.maxParticipants;
  const when = t.startsAt ? format(t.startsAt.toDate(), "EEE d MMM, h:mm a") : "TBD";
  const label = live ? "Live" : status === "completed" ? "Finished" : full ? "Full" : "Upcoming";

  const entry =
    t.entryType === "stars" ? `${t.starsFee ?? 0} 🪙 entry` : t.entryType === "paid" ? `Entry ${t.entryFee ?? "fee"}` : "Free entry";
  const pct = Math.min(100, Math.round((t.participantIds.length / Math.max(1, t.maxParticipants)) * 100));

  return (
    <Link href={`/tournaments/${t.id}`} className="block active:opacity-90">
      <Card className="-mx-4 -mb-px overflow-hidden rounded-none border-x-0 shadow-none md:mx-0 md:mb-0 md:rounded-2xl md:border-x">
        {/* Poster: game art with the name on top, so every tournament is easy to spot */}
        <div className="relative h-40 w-full overflow-hidden bg-brand-gradient">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gameArt(t.game, t.title)} alt="" loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
          <span
            className={cn(
              "absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
              live ? "bg-red-500 text-white" : status === "completed" ? "bg-black/60 text-white/80" : "bg-emerald-500 text-white"
            )}
          >
            {live && <LiveDot />}
            {label}
          </span>
          {joined && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
              <Check className="h-3 w-3" /> Joined
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <p className="line-clamp-2 font-display text-lg font-extrabold leading-tight text-white">{t.title}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-white/80">{t.game}</p>
          </div>
        </div>

        <div className="space-y-2.5 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={organiser?.photoURL ?? undefined} alt="" />
                <AvatarFallback className="text-[9px]">{(organiser?.displayName ?? "?")[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="truncate text-xs font-medium text-steel/70">
                {mine ? "You" : organiser?.displayName ?? "Organiser"}{organiser?.verified && <VerifiedBadge className="ml-1" size={12} />}
                <span className="font-normal text-steel/40"> · organiser</span>
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-foreground">{when}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-muted px-2.5 py-1 text-steel/80">{entry}</span>
            {t.prize && (
              <span className="flex max-w-full items-center gap-1 truncate rounded-full bg-violet/15 px-2.5 py-1 text-violet-glow">
                <Gift className="h-3 w-3 shrink-0" /> <span className="truncate">{t.prize}</span>
              </span>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-steel/60">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t.participantIds.length}/{t.maxParticipants} players</span>
              <span>{full ? "Full" : `${t.maxParticipants - t.participantIds.length} spots left`}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
