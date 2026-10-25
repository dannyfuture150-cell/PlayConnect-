"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, Gift, Trophy, Users } from "lucide-react";
import { useTournaments } from "@/hooks/useTournaments";
import { effectiveStatus } from "@/lib/tournamentStatus";
import { Button } from "@/components/ui/button";

/** Real tournaments on the landing page, so a first-time visitor sees something to join straight away. */
export function LandingTournaments() {
  const { data } = useTournaments();
  const list = (data ?? [])
    .filter((t) => effectiveStatus(t) !== "completed")
    .sort((a, b) => {
      const la = effectiveStatus(a) === "live" ? 0 : 1;
      const lb = effectiveStatus(b) === "live" ? 0 : 1;
      if (la !== lb) return la - lb;
      return (a.startsAt?.toMillis?.() ?? 0) - (b.startsAt?.toMillis?.() ?? 0);
    })
    .slice(0, 3);

  if (!list.length) return null;

  return (
    <section className="mt-12 w-full max-w-2xl text-left">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
        <Trophy className="h-5 w-5 text-violet-glow" /> Open now: join a tournament
      </h2>
      <div className="flex flex-col gap-3">
        {list.map((t) => {
          const live = effectiveStatus(t) === "live";
          return (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                <p className="mt-0.5 truncate text-xs text-steel/50">{t.game}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-steel/60">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {live ? "Live now" : t.startsAt ? format(t.startsAt.toDate(), "EEE d MMM, h:mm a") : "TBD"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t.participantIds.length}/{t.maxParticipants}
                  </span>
                  {t.prize && (
                    <span className="flex items-center gap-1 text-violet-glow">
                      <Gift className="h-3 w-3" />
                      {t.prize}
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" className="shrink-0">{live ? "Watch" : "Join"}</Button>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
