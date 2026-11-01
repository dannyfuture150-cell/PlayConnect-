"use client";

import { CompeteSwitch } from "@/components/shared/CompeteSwitch";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Award, Gamepad2, Medal, Trophy, UserPlus } from "lucide-react";
import { useOrganizerTournaments, useTournaments } from "@/hooks/useTournaments";
import { useLiveAuthor } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { useAuth } from "@/providers/AuthProvider";
import { NextMatchCard } from "@/components/tournaments/NextMatchCard";
import { TournamentRow } from "@/components/tournaments/TournamentRow";
import { CreateTournamentDialog } from "@/components/tournaments/CreateTournamentDialog";
import { gameArt } from "@/lib/gameArt";
import { HubPictureEditor } from "@/components/tournaments/HubPictureEditor";
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

/** The game an organiser mostly runs, e.g. "eFootball" (or "eFootball +1" when they run several). */
function gameLabel(games: Map<string, number>): string {
  const sorted = Array.from(games.entries()).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "Tournaments";
  return sorted.length > 1 ? `${sorted[0][0]} +${sorted.length - 1}` : sorted[0][0];
}

/** One organiser in the players' list, laid out like a group: picture, game on top, organiser below. Tap to open their tournaments. */
function OrganizerCard({ uid, game, total, live, upcoming, onOpen }: { uid: string; game: string; total: number; live: number; upcoming: number; onOpen: () => void }) {
  const { data: org } = useLiveAuthor(uid);
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left active:scale-[0.99]">
      <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-brand-gradient">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={org?.hubPhotoURL || gameArt(game, uid)} alt="" loading="lazy" className="h-full w-full object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 truncate text-lg font-bold text-foreground">
          {org?.displayName ?? "Organiser"}
          {org?.verified && <VerifiedBadge size={14} />}
        </span>
        <span className="mt-0.5 block truncate text-base text-steel/60">{game}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-steel/60">
        {live > 0 ? (
          <span className="flex items-center gap-1.5 font-semibold text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" /> {live} live
          </span>
        ) : upcoming > 0 ? (
          <span className="font-semibold text-emerald-400">{upcoming} upcoming</span>
        ) : null}
        <span>{total} tournament{total === 1 ? "" : "s"}</span>
      </span>
    </button>
  );
}

export default function TournamentsPage() {
  const { profile, loading: authLoading } = useAuth();
  const isOrganizer = profile?.accountType === "organizer";
  // Organisers see only their own tournaments. Players see a list of organisers and open one to see theirs.
  const [orgId, setOrgId] = useState<string | null>(null);
  const everything = useTournaments();
  const mine = useOrganizerTournaments(isOrganizer ? profile?.uid : undefined);
  const theirs = useOrganizerTournaments(!isOrganizer && orgId ? orgId : undefined);
  const showDirectory = !isOrganizer && !orgId;
  const scoped = isOrganizer ? mine : theirs;
  const tournaments = showDirectory ? everything.data : scoped.data;
  const isLoading = authLoading || (showDirectory ? everything.isLoading : scoped.isLoading);
  const { data: orgInfo } = useLiveAuthor(!isOrganizer && orgId ? orgId : undefined);
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
  const organizers = useMemo(() => {
    const m = new Map<string, { total: number; live: number; upcoming: number; games: Map<string, number> }>();
    for (const t of list) {
      const e = m.get(t.organizerId) ?? { total: 0, live: 0, upcoming: 0, games: new Map<string, number>() };
      e.total++;
      const cg = canonicalGame(t.game);
      e.games.set(cg, (e.games.get(cg) ?? 0) + 1);
      const st = effectiveStatus(t);
      if (st === "live") e.live++;
      else if (st === "upcoming") e.upcoming++;
      m.set(t.organizerId, e);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].live - a[1].live || b[1].upcoming - a[1].upcoming || b[1].total - a[1].total);
  }, [list]);
  const joinedNow = useMemo(
    () => (profile ? list.filter((t) => t.participantIds?.includes(profile.uid) && effectiveStatus(t) !== "completed") : []),
    [list, profile]
  );

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
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-lg font-bold text-foreground">My tournaments</p>
          <CreateTournamentDialog />
        </div>
      )}
      {isOrganizer && (
        <HubPictureEditor game={list.length ? gameLabel(organizers[0]?.[1].games ?? new Map()) : "Your tournaments"} />
      )}

      {!isOrganizer && orgId && (
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => { setOrgId(null); setTabChoice(null); setGame("all"); }} className="flex w-fit items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-steel/70">
            <ArrowLeft className="h-3.5 w-3.5" /> All organisers
          </button>
          <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4">
            <span className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-brand-gradient">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={orgInfo?.hubPhotoURL || gameArt(gameLabel(organizers[0]?.[1].games ?? new Map()), orgId)} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 truncate text-lg font-bold text-foreground">
                {orgInfo?.displayName ?? "Organiser"}
                {orgInfo?.verified && <VerifiedBadge size={14} />}
              </span>
              <span className="mt-0.5 block truncate text-base text-steel/60">{gameLabel(organizers[0]?.[1].games ?? new Map())}</span>
            </span>
          </div>
        </div>
      )}

      {/* Players: tournaments are grouped under the organiser who runs them */}
      {showDirectory && !isLoading && (
        <>
          {profile && joinedNow.length > 0 && <NextMatchCard tournaments={joinedNow} uid={profile.uid} />}
          {organizers.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-steel/60">Organisers</p>
              {organizers.map(([uid, c]) => (
                <OrganizerCard key={uid} uid={uid} game={gameLabel(c.games)} total={c.total} live={c.live} upcoming={c.upcoming} onOpen={() => { setOrgId(uid); setTabChoice(null); setGame("all"); }} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Status tabs */}
      {!isLoading && !showDirectory && list.length > 0 && (
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
                ? "You haven't created one yet. Create your first and invite players to join."
                : orgId
                ? "This organiser has no tournaments right now."
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
      {!isLoading && !showDirectory && list.length > 0 && visible.length === 0 && (
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
        {!showDirectory && visible.map((t) => (
          <TournamentRow key={t.id} tournament={t} />
        ))}
      </div>

      {/* Bracket prompt: send people straight to the action */}
      {featured && !showDirectory && (
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
