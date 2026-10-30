"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight, Layers } from "lucide-react";
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
  const live = days.filter((d) => d.date <= today && d.end >= today);
  const next = days.find((d) => d.date > today);
  if (!live.length && !next) return null;

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
    </div>
  );
}
