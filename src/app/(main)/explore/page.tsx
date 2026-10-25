"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useSuggestedPlayers, useTrendingPosts } from "@/hooks/useExplore";
import { useCommunities } from "@/hooks/useCommunities";
import type { Post, UserProfile } from "@/types";
import { formatCount } from "@/lib/utils";
import { PostCard } from "@/components/feed/PostCard";
import { CommunityCard } from "@/components/communities/CommunityCard";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FollowButton } from "@/components/profile/FollowButton";

export default function ExplorePage() {
  const { profile } = useAuth();
  const { data: trendingPosts, isLoading: postsLoading } = useTrendingPosts();
  const { data: communities, isLoading: communitiesLoading } = useCommunities();
  const { data: suggestedPlayers, isLoading: playersLoading } = useSuggestedPlayers(profile?.uid);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-xl font-bold text-foreground">Explore</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-steel/50">Suggested players</h2>
        {playersLoading && <div className="h-16 animate-pulse rounded-2xl bg-muted" />}
        {!playersLoading && (!suggestedPlayers || suggestedPlayers.length === 0) && (
          <p className="text-sm text-steel/40">No other players yet.</p>
        )}
        <div className="flex flex-col gap-2">
          {suggestedPlayers?.slice(0, 4).map((p) => (
            <Card key={p.uid} className="flex items-center gap-3 p-3">
              <Link href={`/profile/${p.username}`} className="flex flex-1 items-center gap-3">
                <Avatar>
                  <AvatarImage src={p.photoURL ?? undefined} alt={p.displayName} />
                  <AvatarFallback>{p.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.displayName}</p>
                  <p className="text-xs text-steel/50">@{p.username} · {formatCount(p.followersCount)} followers</p>
                </div>
              </Link>
              <FollowButton targetUid={p.uid} />
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-steel/50">Popular communities</h2>
        {communitiesLoading && <div className="h-16 animate-pulse rounded-2xl bg-muted" />}
        {!communitiesLoading && (!communities || communities.length === 0) && (
          <p className="text-sm text-steel/40">No communities yet.</p>
        )}
        <div className="flex flex-col gap-2">
          {communities?.slice(0, 4).map((c) => (
            <CommunityCard key={c.id} community={c} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-steel/50">Trending posts</h2>
        {postsLoading && <div className="h-40 animate-pulse rounded-2xl bg-muted" />}
        {!postsLoading && (!trendingPosts || trendingPosts.length === 0) && (
          <p className="text-sm text-steel/40">No posts yet.</p>
        )}
        <div className="flex flex-col gap-4">
          {trendingPosts?.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
