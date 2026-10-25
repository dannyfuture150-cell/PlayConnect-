"use client";

import { CompeteSwitch } from "@/components/shared/CompeteSwitch";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Gamepad2, Medal, Trophy, UserPlus } from "lucide-react";
import { useTournaments } from "@/hooks/useTournaments";
import { useAuth } from "@/providers/AuthProvider";
import { TournamentRow } from "@/components/tournaments/TournamentRow";
import { CreateTournamentDialog } from "@/components/tournaments/CreateTournamentDialog";
import { canonicalGame } from "@/lib/leaderboardGames";
import { effectiveStatus } from "@/lib/tournamentStatus";
import { WinnersStrip } from "@/components/tournaments/WinnersStrip";
import { markTournamentsSeen } from "@/hooks/useTournamentDot";
import { cn } from "@/lib/utils";
import type { Tournament } from "@/types";

type Tab = "live" | "upcoming" | "completed" | "all";

const TAB_LABEL: Record<Tab, string> = {
  live: "Live now",
  upcoming: "Upcoming",
  completed: "Finished",
  all: "All",
};

const STEPS = [
  { icon: UserPlus, title: "Join", text: "Pick a tournament and tap Join." },
  { icon: Gamepad2, title: "Play", text: "Play your matches and report the score." },
  { icon: Medal, title: "Win", text: "Win the final to get the trophy and move up the leaderboard." },
];

export default function TournamentsPage() {
  const { data: tournaments, isLoading } = useTournaments();
  const { profile } = useAuth();
  const isOrganizer = profile?.accountType === "organizer";
  const [tabChoice, setTabChoice] = useState<Tab | null>(null);
  const [game, setGame] = useState<string>("all");

  // Opening this page clears the dot on the Tournaments tab.
  useEffect(() => {
    if (tournaments) markTournamentsSeen();
  }, [tournaments]);

  const list = tournaments ?? [];
  const counts = useMemo(
    () => ({
      live: list.filter((t) => effectiveStatus(t) === "live").length,
      upcoming: list.filter((t) => effectiveStatus(t) === "upcoming").length,
      completed: list.filter((t) => effectiveStatus(t) === "completed").length,
      all: list.length,
    }),
    [list]
  );
  const games = useMemo(
    () => Array.from(new Set(list.map((t) => canonicalGame(t.game)))).sort(),
    [list]
  );

  // Open on whatever has something in it, so nobody lands on an empty tab.
  const tab: Tab = tabChoice ?? (counts.live > 0 ? "live" : counts.upcoming > 0 ? "upcoming" : "all");

  // The tournament to point people at: something live, else one they joined, else the next upcoming.
  const featured = useMemo(
    () =>
      list.find((t) => effectiveStatus(t) === "live") ??
      list.find((t) => effectiveStatus(t) !== "completed" && !!profile && t.participantIds?.includes(profile.uid)) ??
      list.find((t) => effectiveStatus(t) === "upcoming"),
    [list, profile]
  );

  const visible = useMemo(() => {
    const rank = (t: Tournament) => (effectiveStatus(t) === "live" ? 0 : effectiveStatus(t) === "upcoming" ? 1 : 2);
    const start = (t: Tournament) => t.startsAt?.toMillis?.() ?? 0;
    return list
      .filter((t) => (tab === "all" ? true : effectiveStatus(t) === tab))
      .filter((t) => game === "all" || canonicalGame(t.game) === game)
      .sort((a, b) => rank(a) - rank(b) || (effectiveStatus(a) === "completed" ? start(b) - start(a) : start(a) - start(b)));
  }, [list, tab, game]);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <CompeteSwitch />
      {isOrganizer && (
        <div className="flex justify-end">
          <CreateTournamentDialog />
        </div>
      )}

      {/* Status tabs */}
      {!isLoading && list.length > 0 && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTabChoice(t)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                  tab === t
                    ? "border-transparent bg-brand-gradient text-white"
                    : "border-border bg-card text-steel/70 hover:bg-muted"
                )}
              >
                {t === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />}
                {TAB_LABEL[t]}
                <span className={cn("rounded-full px-1.5 text-[10px]", tab === t ? "bg-white/25" : "bg-muted")}>{counts[t]}</span>
              </button>
            ))}
          </div>

          {games.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {["all", ...games].map((g) => (
                <button
                  key={g}
                  onClick={() => setGame(g)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                    game === g ? "border-violet bg-violet/15 text-violet-glow" : "border-border text-steel/60 hover:bg-muted"
                  )}
                >
                  {g === "all" ? "All games" : g}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {/* Nothing created yet: show how it works instead of a blank page */}
      {!isLoading && list.length === 0 && (
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5">
          <div className="text-center">
            <Trophy className="mx-auto h-10 w-10 text-violet-glow" />
            <p className="mt-2 font-display text-base font-bold text-foreground">No tournaments yet</p>
            <p className="mt-1 text-sm text-steel/60">
              {isOrganizer
                ? "Create the first one and invite players to join."
                : "Organisers post tournaments here. Check back soon, or switch to an Organiser account to host your own."}
            </p>
          </div>
          <div className="grid gap-2.5">
            {STEPS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl bg-muted p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet-glow">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-steel/60">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* A tab or game filter with nothing in it */}
      {!isLoading && list.length > 0 && visible.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Trophy className="mx-auto h-8 w-8 text-steel/30" />
          <p className="mt-2 text-sm font-medium text-foreground">
            {tab === "live" ? "No tournaments are live right now" : tab === "completed" ? "No finished tournaments yet" : "Nothing matches that filter"}
          </p>
          <button
            onClick={() => {
              setTabChoice("all");
              setGame("all");
            }}
            className="mt-3 rounded-full bg-brand-gradient px-4 py-2 text-xs font-semibold text-white"
          >
            Show all tournaments
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 md:gap-3">
        {visible.map((t) => (
          <TournamentRow key={t.id} tournament={t} />
        ))}
      </div>

      {/* Bracket prompt: send people straight to the action */}
      {featured && (
        <Link
          href={`/tournaments/${featured.id}`}
          className="flex items-center gap-3 rounded-2xl border border-violet/30 bg-violet/10 p-3.5 active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white">
            <Trophy className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">Check out the bracket</span>
            <span className="block truncate text-xs text-steel/60">
              {featured.title} · {effectiveStatus(featured) === "live" ? "Live now" : "See who plays who"}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-violet-glow" />
        </Link>
      )}

      <WinnersStrip tournaments={tournaments} />

      <Link href="/leaderboard" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet-glow">
          <Award className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-bold text-foreground">Leaderboard</span>
          <span className="block text-[11px] text-steel/50">Who is #1</span>
        </span>
      </Link>
    </div>
  );
}
