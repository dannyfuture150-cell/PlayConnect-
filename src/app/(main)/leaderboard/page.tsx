"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Crown, Medal, Trophy } from "lucide-react";
import { LEADERBOARD_GAMES, OVERALL } from "@/lib/leaderboardGames";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const PODIUM_STYLE = [
  { ring: "ring-amber-400", icon: Crown, iconColor: "text-amber-400", order: "order-2 sm:order-2", size: "h-20 w-20 sm:h-24 sm:w-24" },
  { ring: "ring-slate-300", icon: Medal, iconColor: "text-slate-300", order: "order-1 sm:order-1", size: "h-16 w-16 sm:h-20 sm:w-20" },
  { ring: "ring-amber-700", icon: Medal, iconColor: "text-amber-700", order: "order-3 sm:order-3", size: "h-16 w-16 sm:h-20 sm:w-20" },
];

export default function LeaderboardPage() {
  const searchParams = useSearchParams();
  const [game, setGame] = useState(searchParams.get("game") || OVERALL);
  const { data: entries, isLoading } = useLeaderboard(game);

  const podium = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-sm text-steel/50">Ranked by tournament wins — overall or per game.</p>
      </div>

      <div className="flex w-full max-w-full min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[OVERALL, ...LEADERBOARD_GAMES].map((g) => (
          <button
            key={g}
            onClick={() => setGame(g)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              game === g
                ? "border-violet/50 bg-brand-gradient text-white"
                : "border-border bg-card text-steel/60 hover:text-steel"
            )}
          >
            {g}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        </div>
      )}

      {!isLoading && (!entries || entries.length === 0) && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Trophy className="mx-auto h-8 w-8 text-steel/30" />
          <p className="mt-3 text-sm text-steel/50">
            {game === OVERALL ? "No tournament wins recorded yet" : `No tournament wins recorded for ${game} yet`} — a win is credited when the final match of a tournament is reported.
          </p>
        </div>
      )}

      {podium.length > 0 && (
        <div className="flex items-end justify-center gap-3 sm:gap-6">
          {podium.map((entry, i) => {
            const style = PODIUM_STYLE[i];
            const Icon = style.icon;
            return (
              <Link
                key={entry.profile.uid}
                href={`/profile/${entry.profile.username}`}
                className={cn("flex flex-col items-center gap-2", style.order)}
              >
                <Icon className={cn("h-6 w-6", style.iconColor)} />
                <Avatar className={cn(style.size, "ring-4", style.ring)}>
                  <AvatarImage src={entry.profile.photoURL ?? undefined} alt={entry.profile.displayName} />
                  <AvatarFallback>{entry.profile.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="max-w-[90px] truncate text-center text-xs font-semibold text-foreground">
                  {entry.profile.displayName}
                </p>
                <p className="text-[11px] text-steel/50">{entry.wins} win{entry.wins === 1 ? "" : "s"}</p>
              </Link>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <div className="flex flex-col md:gap-2">
          {rest.map((entry, i) => (
            <Link key={entry.profile.uid} href={`/profile/${entry.profile.username}`}>
              <Card className="-mx-4 -mb-px rounded-none border-x-0 shadow-none md:mx-0 md:mb-0 md:rounded-2xl md:border-x flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted">
                <span className="w-6 shrink-0 text-center text-sm font-bold text-steel/40">#{i + 4}</span>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={entry.profile.photoURL ?? undefined} alt={entry.profile.displayName} />
                  <AvatarFallback>{entry.profile.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium text-foreground">{entry.profile.displayName}</span>
                <span className="text-xs text-steel/50">{entry.wins} win{entry.wins === 1 ? "" : "s"}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
