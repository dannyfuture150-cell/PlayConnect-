"use client";

import { LiveDot } from "@/components/shared/LiveDot";
import Link from "next/link";
import Image from "next/image";
import { Layers, Users } from "lucide-react";
import { useLeagues } from "@/hooks/useLeagues";
import { useTournaments } from "@/hooks/useTournaments";
import { effectiveStatus } from "@/lib/tournamentStatus";
import { WinnersStrip } from "@/components/tournaments/WinnersStrip";
import { gameArt } from "@/lib/gameArt";
import { format } from "date-fns";
import { useAuth } from "@/providers/AuthProvider";
import { useCommunities } from "@/hooks/useCommunities";
import { useSuggestedPlayers, useTrendingPosts } from "@/hooks/useExplore";
import { useIsFollowing } from "@/hooks/useFollow";
import { FollowButton } from "@/components/profile/FollowButton";
import { PostCard } from "@/components/feed/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCount } from "@/lib/utils";
import type { Tournament, UserProfile } from "@/types";

export type InsertKind = "players" | "groups" | "trending" | "leagues" | "tournaments" | "winners";

function PlayerCard({ p, viewer }: { p: UserProfile; viewer?: string }) {
  const following = useIsFollowing(p.uid, viewer);
  if (following) return null;
  return (
    <div className="flex w-36 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center">
      <Link href={`/profile/${p.username}`} className="flex flex-col items-center gap-1.5">
        <Avatar className="h-16 w-16">
          <AvatarImage src={p.photoURL ?? undefined} alt={p.displayName} />
          <AvatarFallback>{p.displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="w-28 truncate text-sm font-semibold text-foreground">{p.displayName}</p>
        <p className="w-28 truncate text-[11px] text-steel/50">{formatCount(p.followersCount)} followers</p>
      </Link>
      <FollowButton targetUid={p.uid} />
    </div>
  );
}

/** One "from Explore" block dropped between feed posts. */
export function ExploreInsert({ kind, seen }: { kind: InsertKind; seen: Set<string> }) {
  const { profile } = useAuth();
  const players = useSuggestedPlayers(profile?.uid);
  const communities = useCommunities();
  const trending = useTrendingPosts();
  const leagues = useLeagues();
  const tournaments = useTournaments();

  if (kind === "players") {
    const list = (players.data ?? []).slice(0, 8);
    if (list.length === 0) return null;
    return (
      <div className="border-b border-border bg-card py-3">
        <p className="px-4 pb-2 text-sm font-semibold text-foreground">Suggested for you</p>
        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none">
          {list.map((p) => (
            <PlayerCard key={p.uid} p={p} viewer={profile?.uid} />
          ))}
        </div>
      </div>
    );
  }

  if (kind === "winners") {
    return (
      <div className="border-b border-border bg-card px-4 py-4">
        <WinnersStrip tournaments={tournaments.data} />
      </div>
    );
  }

  if (kind === "tournaments") {
    const rank = (t: Tournament) => (effectiveStatus(t) === "live" ? 0 : 1);
    const list = (tournaments.data ?? [])
      .filter((t) => effectiveStatus(t) !== "completed")
      .sort((a, b) => rank(a) - rank(b) || (a.startsAt?.toMillis?.() ?? 0) - (b.startsAt?.toMillis?.() ?? 0))
      .slice(0, 8);
    if (list.length === 0) return null;
    return (
      <div className="border-b border-border bg-card py-3">
        <div className="flex items-center justify-between px-4 pb-2">
          <p className="text-sm font-semibold text-foreground">Tournaments 🏆</p>
          <Link href="/tournaments" className="text-xs font-semibold text-violet-glow">See all</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none">
          {list.map((t) => {
            const live = effectiveStatus(t) === "live";
            const joined = !!profile && t.participantIds?.includes(profile.uid);
            const full = t.participantIds.length >= t.maxParticipants;
            return (
              <Link
                key={t.id}
                href={live || joined || full ? `/tournaments/${t.id}` : `/tournaments/${t.id}?join=1`}
                className="flex w-52 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative h-24 w-full bg-brand-gradient">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gameArt(t.game, t.title)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${live ? "bg-red-500 text-white" : "bg-black/60 text-white"}`}
                  >
                    {live ? <span className="flex items-center gap-1"><LiveDot className="h-2 w-2" /> LIVE</span> : t.startsAt ? format(t.startsAt.toDate(), "EEE d MMM, h:mm a") : "Soon"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                  <p className="truncate text-[11px] text-steel/50">{t.game}</p>
                  {t.prize && <p className="truncate text-[11px] font-semibold text-violet-glow">🎁 {t.prize}</p>}
                  <p className="text-[11px] text-steel/60">{t.participantIds.length}/{t.maxParticipants} players</p>
                  <span className="mt-1 rounded-lg bg-violet px-3 py-1.5 text-center text-xs font-semibold text-white">
                    {live ? "Watch" : joined ? "Joined ✓" : full ? "View" : t.entryType === "paid" ? "View & join" : "Join free"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  if (kind === "leagues") {
    const list = (leagues.data ?? []).filter((l) => !l.started).slice(0, 8);
    if (list.length === 0) return null;
    return (
      <div className="border-b border-border bg-card py-3">
        <div className="flex items-center justify-between px-4 pb-2">
          <p className="text-sm font-semibold text-foreground">Open leagues</p>
          <Link href="/leagues" className="text-xs font-semibold text-violet-glow">See all</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none">
          {list.map((l) => (
            <Link
              key={l.id}
              href={`/leagues/${l.id}`}
              className="flex w-40 shrink-0 flex-col gap-1.5 rounded-2xl border border-border bg-card p-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <Layers className="h-5 w-5" />
              </span>
              <p className="truncate text-sm font-semibold text-foreground">{l.name}</p>
              <p className="truncate text-[11px] text-steel/50">{l.game}</p>
              <p className="text-[11px] text-steel/60">{l.teamsCount}/{l.maxParticipants} joined</p>
              <span className="mt-1 rounded-lg bg-violet px-3 py-1.5 text-center text-xs font-semibold text-white">Join</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "groups") {
    const list = (communities.data ?? []).filter((c) => !profile || !c.memberIds?.includes(profile.uid)).slice(0, 8);
    if (list.length === 0) return null;
    return (
      <div className="border-b border-border bg-card py-3">
        <p className="px-4 pb-2 text-sm font-semibold text-foreground">Groups to join</p>
        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-none">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/communities/${c.slug}`}
              className="flex w-36 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center"
            >
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-brand-gradient">
                {c.photoURL ? (
                  <Image src={c.photoURL} alt={c.name} fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xl font-bold text-white">{c.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <p className="w-28 truncate text-sm font-semibold text-foreground">{c.name}</p>
              <p className="flex items-center gap-1 text-[11px] text-steel/50">
                <Users className="h-3 w-3" /> {formatCount(c.memberCount)}
              </p>
              <span className="rounded-lg bg-violet px-3.5 py-1.5 text-xs font-semibold text-white">View</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const post = (trending.data ?? []).find((p) => !seen.has(p.id));
  if (!post) return null;
  return (
    <div>
      <p className="border-b border-border bg-card px-4 pb-1 pt-3 text-sm font-semibold text-foreground">Trending 🔥</p>
      <PostCard post={post} />
    </div>
  );
}
