"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import type { League } from "@/types";
import { CalendarClock, ChevronRight, Layers, Users } from "lucide-react";
import { LiveDot } from "@/components/shared/LiveDot";
import { useLeagues } from "@/hooks/useLeagues";

interface Day {
  leagueId: string;
  name: string;
  round: number;
  date: string; // start, yyyy-mm-dd
  end: string; // last day of the matchday, yyyy-mm-dd
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function pretty(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

/** League matchdays on the feed, like tournaments: "live" on the day itself, "next" for the coming week. */
export function FeedLeagueStrip() {
  const { data: leagues } = useLeagues();
  const today = ymd(new Date());
  const weekAhead = ymd(new Date(Date.now() + 7 * 86400_000));

  const days: Day[] = [];
  for (const l of leagues ?? []) {
    if (!l.started) continue;
    for (const [round, date] of Object.entries(l.matchdayDates ?? {})) {
      const end = (l.matchdayEnds ?? {})[round] || date;
      // finished matchdays (end date already passed) drop off the feed; others show while on, or in the next 7 days
      if (end >= today && date <= weekAhead) days.push({ leagueId: l.id, name: l.name, round: Number(round), date, end });
    }
  }
  days.sort((a, b) => (a.date === b.date ? a.round - b.round : a.date < b.date ? -1 : 1));
  // leagues still open for people to join (newest first; the list is already newest first)
  const open = (leagues ?? []).filter((l) => !l.started && (l.teamsCount ?? 0) < l.maxParticipants).slice(0, 2);
  const live = days.filter((d) => d.date <= today && d.end >= today);
  const next = days.find((d) => d.date > today);
  if (!live.length && !next && !open.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {live.slice(0, 2).map((d) => (
        <Link key={`${d.leagueId}-${d.round}`} href={`/leagues/${d.leagueId}`} className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
            <Layers className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-red-500">
              <LiveDot /> Live league · Matchday {d.round}
            </span>
            <span className="block truncate text-sm font-bold text-foreground">{d.name}</span>
            <span className="block text-xs text-steel/60">{d.end > today ? `On until ${pretty(d.end)}. See your fixture` : "Matchday is today. See your fixture"}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-steel/50" />
        </Link>
      ))}
      {next && (
        <Link href={`/leagues/${next.leagueId}`} className="flex items-center gap-3 rounded-2xl border border-violet/30 bg-violet/10 p-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white">
            <CalendarClock className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-violet-glow">Next matchday · {pretty(next.date)}</span>
            <span className="block truncate text-sm font-bold text-foreground">{next.name}</span>
            <span className="block text-xs text-steel/60">Matchday {next.round}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-steel/50" />
        </Link>
      )}
      {open.map((l) => (
        <OpenLeagueCard key={l.id} league={l} />
      ))}
      <Link href="/leagues" className="text-center text-xs font-semibold text-violet-glow">
        See all leagues →
      </Link>
    </div>
  );
}

/** A league still open to join. Shows "You're in" once the player has joined (one small read per card). */
function OpenLeagueCard({ league: l }: { league: League }) {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const mine = useQuery<boolean>({
    queryKey: ["league-joined", l.id, uid],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "leagues", l.id, "teams"), where("memberIds", "array-contains", uid), limit(1)));
      return !snap.empty;
    },
    enabled: !!uid,
    staleTime: 5 * 60 * 1000,
  });
  const joined = mine.data === true;
  const requested = !joined && !!uid && (l.pendingParticipantIds ?? []).includes(uid);
  return (
    <Link href={`/leagues/${l.id}`} className="flex items-center gap-3 rounded-2xl border border-violet/30 bg-violet/10 p-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white">
        <Layers className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-violet-glow">League open · {l.game}</span>
        <span className="block truncate text-sm font-bold text-foreground">{l.name}</span>
        <span className="flex items-center gap-2 text-xs text-steel/60">
          <Users className="h-3 w-3" />
          {l.teamsCount ?? 0}/{l.maxParticipants} joined
          {l.entryType === "paid" ? ` · Entry ${l.entryFee ?? "fee"}` : " · Free entry"}
          {l.prize ? ` · 🏆 ${l.prize}` : ""}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white">
        {joined ? "You're in ✓" : requested ? "Requested" : "Join"}
      </span>
    </Link>
  );
}
