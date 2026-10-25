"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { useWinners } from "@/hooks/useWinners";
import type { Tournament } from "@/types";
import { VerifiedTick } from "@/components/shared/VerifiedBadge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function WinnersStrip({ tournaments }: { tournaments: Tournament[] | undefined }) {
  const { entries, potw } = useWinners(tournaments);
  if (!entries.length && !potw) return null;

  return (
    <div className="flex flex-col gap-3">
      {potw && (
        <Link
          href={`/profile/${potw.user.username}`}
          className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-yellow-400/40 bg-gradient-to-b from-yellow-400/15 to-transparent px-4 pb-4 pt-5 text-center"
        >
          <Crown className="-mb-1 h-6 w-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" />
          <Avatar className="h-24 w-24 ring-4 ring-yellow-400 ring-offset-2 ring-offset-background">
            <AvatarImage src={potw.user.photoURL ?? undefined} alt={potw.user.displayName} />
            <AvatarFallback className="text-2xl">{potw.user.displayName?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-500">Player of the week</span>
          <span className="mt-0.5 flex items-center justify-center text-lg font-bold text-foreground">
            {potw.user.displayName}
            <VerifiedTick uid={potw.user.uid} size={16} />
          </span>
          <span className="text-xs text-steel/60">
            {potw.wins} tournament win{potw.wins === 1 ? "" : "s"} this week
          </span>
        </Link>
      )}

      {entries.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel/50">Recent winners</p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {entries.map(({ tournament, user }) => (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.id}`}
                className="flex w-36 shrink-0 flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 text-center"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName} />
                  <AvatarFallback>{user.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="w-full truncate text-sm font-semibold text-foreground">{user.displayName}</span>
                <span className="w-full truncate text-[11px] text-steel/60">{tournament.game}</span>
                {tournament.prize && <span className="w-full truncate text-[11px] font-semibold text-violet-glow">🏆 {tournament.prize}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
