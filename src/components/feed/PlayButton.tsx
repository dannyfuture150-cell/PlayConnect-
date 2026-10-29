"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useTournaments } from "@/hooks/useTournaments";
import { useMyNextMatches } from "@/components/tournaments/NextMatchCard";
import { effectiveStatus } from "@/lib/tournamentStatus";

/** One big button on the feed: goes to your next match, or a tournament you can join, or the tournaments tab. */
export function PlayButton() {
  const { profile } = useAuth();
  const { data } = useTournaments();
  const uid = profile?.uid;
  const isOrganizer = profile?.accountType === "organizer";

  const joined = useMemo(
    () => (data ?? []).filter((t) => !!uid && t.participantIds?.includes(uid) && effectiveStatus(t) !== "completed"),
    [data, uid]
  );
  const nextMatches = useMyNextMatches(isOrganizer ? [] : joined, uid);

  if (!profile) return null;

  let href = "/tournaments";
  let label = "Find a tournament";
  let sub = "See who's running one";

  if (isOrganizer) {
    label = "My tournaments";
    sub = "Create and manage yours";
  } else if (nextMatches[0]) {
    const n = nextMatches[0];
    href = `/tournaments/${n.t.id}`;
    label = "Play your next match";
    sub = `${n.opp ? `vs ${n.opp.displayName}` : "Waiting for your opponent"} · ${n.label}`;
  } else if (joined[0]) {
    href = `/tournaments/${joined[0].id}`;
    label = "Go to your tournament";
    sub = joined[0].title;
  } else {
    const open = (data ?? [])
      .filter((t) => effectiveStatus(t) === "upcoming" && !t.bracketStarted && (t.participantIds?.length ?? 0) < t.maxParticipants)
      .sort((a, b) => (a.startsAt?.toMillis?.() ?? 0) - (b.startsAt?.toMillis?.() ?? 0))[0];
    if (open) {
      href = `/tournaments/${open.id}`;
      label = "Join a tournament";
      sub = open.title;
    }
  }

  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl bg-brand-gradient p-4 text-white shadow-lg active:scale-[0.99]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Play className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold">{label}</span>
        <span className="block truncate text-xs text-white/80">{sub}</span>
      </span>
    </Link>
  );
}
