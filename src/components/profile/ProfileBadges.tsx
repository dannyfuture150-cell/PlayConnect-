"use client";

import { format } from "date-fns";
import { Award, CalendarDays, Gamepad2, Trophy } from "lucide-react";
import type { UserProfile } from "@/types";
import { formatCount } from "@/lib/utils";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { hasVerifiedBadge } from "@/lib/verified";
import { Card } from "@/components/ui/card";

/** Everything a visitor should see about someone: verified status, badges, wins per game, organiser record, join date. */
export function ProfileBadges({ profile }: { profile: UserProfile }) {
  const badges = profile.badges ?? [];
  const wins = Object.entries(profile.gameWins ?? {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const isOrganizer = profile.accountType === "organizer";
  const joined = profile.createdAt?.toDate?.();
  const verified = hasVerifiedBadge(badges);

  return (
    <Card className="flex flex-col gap-5 p-5">
      {verified && (
        <p className="flex items-center gap-2 rounded-xl bg-[#1d9bf0]/10 px-3 py-2 text-sm font-medium text-foreground">
          <VerifiedBadge size={18} /> Verified {isOrganizer ? "organiser" : "player"}
        </p>
      )}

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-steel/50">
          <Award className="h-3.5 w-3.5" /> Badges
        </h3>
        {badges.length === 0 ? (
          <p className="text-sm text-steel/40">No badges yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b} className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
                {b}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-steel/50">
          <Trophy className="h-3.5 w-3.5" /> Achievements
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Tournament wins" value={formatCount(profile.tournamentWins ?? 0)} />
          {isOrganizer ? (
            <>
              <Stat label="Organised" value={formatCount(profile.tournamentsOrganized ?? 0)} />
              <Stat label="Completed" value={formatCount((profile.successfulTournamentsOrganized ?? 0) + (profile.successfulLeaguesOrganized ?? 0))} />
            </>
          ) : (
            <>
              <Stat label="Posts" value={formatCount(profile.postsCount ?? 0)} />
              <Stat label="Followers" value={formatCount(profile.followersCount ?? 0)} />
            </>
          )}
        </div>
        {wins.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {wins.map(([game, n]) => (
              <span key={game} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-steel/70">
                <Gamepad2 className="h-3 w-3" /> {game} · <strong className="text-foreground">{n}</strong> win{n === 1 ? "" : "s"}
              </span>
            ))}
          </div>
        )}
      </section>

      {joined && (
        <p className="flex items-center gap-1.5 text-xs text-steel/50">
          <CalendarDays className="h-3.5 w-3.5" /> Joined {format(joined, "MMMM yyyy")}
        </p>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-2 py-3">
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-steel/50">{label}</p>
    </div>
  );
}
