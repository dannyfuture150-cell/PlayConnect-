"use client";

import { LiveDot } from "@/components/shared/LiveDot";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Flame, Trophy, Users } from "lucide-react";
import { useTournaments } from "@/hooks/useTournaments";
import { useAuth } from "@/providers/AuthProvider";
import { effectiveStatus } from "@/lib/tournamentStatus";
import type { Tournament } from "@/types";

function countdown(ms: number): string {
  if (ms <= 0) return "Starting now";
  const m = Math.floor(ms / 60_000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `Starts in ${d}d ${h}h`;
  if (h > 0) return `Starts in ${h}h ${m % 60}m`;
  return `Starts in ${m}m`;
}

/** Tournament-flavoured block at the top of the feed: live now, next up, winners. */
export function FeedTournamentHub() {
  const { profile } = useAuth();
  const { data: tournaments } = useTournaments({ poll: true });
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const list = tournaments ?? [];
  const live = list.filter((t) => effectiveStatus(t) === "live");
  const upcoming = list.filter((t) => effectiveStatus(t) === "upcoming");
  const next = upcoming[0] as Tournament | undefined;
  if (!list.length) return null;

  const uid = profile?.uid;
  const joined = (t: Tournament) => !!uid && (t.participantIds ?? []).includes(uid);

  return (
    <div className="flex flex-col gap-3">
      {live.length > 0 && (
        <Link
          href={`/tournaments/${live[0].id}`}
          className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
            <Flame className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-red-500"><LiveDot /> Live now</span>
            <span className="block truncate text-sm font-bold text-foreground">{live[0].title}</span>
            <span className="block text-xs text-steel/60">Check out the bracket{live.length > 1 ? ` · +${live.length - 1} more live` : ""}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-steel/50" />
        </Link>
      )}

      {next && (
        <Link
          href={`/tournaments/${next.id}`}
          className="flex items-center gap-3 rounded-2xl border border-violet/30 bg-violet/10 p-3.5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white">
            <Trophy className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-violet-glow">
              {countdown((next.startsAt?.toMillis?.() ?? 0) - Date.now())}
            </span>
            <span className="block truncate text-sm font-bold text-foreground">{next.title}</span>
            <span className="flex items-center gap-2 text-xs text-steel/60">
              <Users className="h-3 w-3" />
              {(next.participantIds ?? []).length}/{next.maxParticipants} joined
              {next.prize ? ` · 🏆 ${next.prize}` : ""}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white">
            {joined(next) ? "You're in ✓" : (next.participantIds ?? []).length >= next.maxParticipants ? "Full" : "Join"}
          </span>
        </Link>
      )}

      <Link href="/tournaments" className="text-center text-xs font-semibold text-violet-glow">
        See all tournaments →
      </Link>
    </div>
  );
}
