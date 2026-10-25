"use client";

import { Trophy, Shield, Award, Gamepad2, BadgeCheck } from "lucide-react";
import type { UserProfile } from "@/types";
import { formatCount } from "@/lib/utils";
import { computeRank, computeOrganizerRank, withRankOverride } from "@/lib/rank";
import { useOrganizerPaidCount } from "@/hooks/useOrganizerTrust";
import { useAuth } from "@/providers/AuthProvider";
import { SharePlayerCardButton } from "@/components/shared/SharePlayerCardButton";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { hasVerifiedBadge } from "@/lib/verified";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const SKILL_RANK_COLOR: Record<string, string> = {
  Rookie: "text-steel/70 border-steel/30 bg-steel/5",
  Amateur: "text-signal-blue border-signal-blue/30 bg-signal-blue/10",
  Pro: "text-cyan border-cyan/30 bg-cyan/10",
  Elite: "text-violet-glow border-violet/40 bg-violet/10",
  Legend: "text-signal-purple border-signal-purple/40 bg-signal-purple/10",
};

export function PlayerCard({ profile }: { profile: UserProfile }) {
  const { user } = useAuth();
  const isOrganizer = profile.accountType === "organizer";
  const isMe = !!user && user.uid === profile.uid;
  const { data: paidCount = 0 } = useOrganizerPaidCount(profile.uid, isOrganizer);

  const rank = withRankOverride(
    isOrganizer
      ? computeOrganizerRank(profile.successfulTournamentsOrganized ?? 0, profile.successfulLeaguesOrganized ?? 0)
      : computeRank(profile.followersCount, profile.postsCount, profile.tournamentWins ?? 0),
    profile.rankOverride
  );
  const skillColor = SKILL_RANK_COLOR[rank.skillLevel] ?? SKILL_RANK_COLOR.Rookie;

  return (
    <Card className="relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-brand-radial opacity-60" />

      <div className="relative flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.photoURL ?? undefined} alt={profile.displayName} />
          <AvatarFallback className="text-lg">{profile.displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold text-foreground">{profile.displayName}{hasVerifiedBadge(profile.badges) && <VerifiedBadge className="ml-1" size={16} />}</h3>
            <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-steel/60">
              {isOrganizer ? <Trophy className="h-2.5 w-2.5" /> : <Gamepad2 className="h-2.5 w-2.5" />}
              {isOrganizer ? "Organiser" : "Player"}
            </span>
          </div>
          <p className="text-sm text-steel/50">@{profile.username}</p>
        </div>
        <span className={`ml-auto rounded-full border px-3 py-1 text-xs font-semibold ${skillColor}`}>
          {rank.skillLevel}
        </span>
      </div>

      {isOrganizer ? (
        <div className="relative mt-5 grid grid-cols-3 gap-3 text-center">
          <Stat label="Organised" value={formatCount(profile.tournamentsOrganized ?? 0)} />
          <Stat label="Completed" value={formatCount((profile.successfulTournamentsOrganized ?? 0) + (profile.successfulLeaguesOrganized ?? 0))} />
          <Stat label="Reputation" value={formatCount(rank.reputationScore)} />
        </div>
      ) : (
        <div className="relative mt-5 grid grid-cols-3 gap-3 text-center">
          <Stat label="Followers" value={formatCount(profile.followersCount)} />
          <Stat label="Reputation" value={formatCount(rank.reputationScore)} />
          <Stat label="Tournament wins" value={formatCount(profile.tournamentWins ?? 0)} />
        </div>
      )}

      {isOrganizer && paidCount > 0 && (
        <p className="relative mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <BadgeCheck className="h-4 w-4" />
          {paidCount >= 3 ? "Trusted organiser · " : ""}
          {paidCount} prize{paidCount === 1 ? "" : "s"} paid
        </p>
      )}

      {rank.nextRank && rank.pointsToNextRank !== null && (
        <p className="relative mt-3 text-center text-xs text-steel/40">
          {rank.pointsToNextRank} more rep to reach <span className="font-medium text-steel/60">{rank.nextRank}</span>
        </p>
      )}

      <div className="relative mt-5 flex flex-wrap gap-1.5">
        {profile.favoriteGames.slice(0, 4).map((game) => (
          <span key={game} className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-steel/70">
            {game}
          </span>
        ))}
      </div>

      <div className="relative mt-5 flex items-center gap-4 border-t border-border/60 pt-4 text-xs text-steel/50">
        <span className="flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-violet-glow" /> {profile.badges.length} badges
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-cyan" /> {profile.platform ?? "—"}
        </span>
        <span className="flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-signal-purple" /> {profile.postsCount} posts
        </span>
      </div>

      {isMe && !isOrganizer && (
        <div className="relative mt-4">
          <SharePlayerCardButton
            profile={profile}
            className="border-violet/50 text-violet hover:bg-violet/10 dark:text-violet-glow"
            secondaryClassName="border-violet/50 text-violet hover:bg-violet/10 dark:text-violet-glow"
            label="Share my player card"
          />
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card py-2.5">
      <p className="font-display text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-steel/40">{label}</p>
    </div>
  );
}
