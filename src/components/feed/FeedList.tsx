"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFeed } from "@/hooks/usePosts";
import { PostCard } from "@/components/feed/PostCard";
import { ExploreInsert, type InsertKind } from "@/components/feed/ExploreInserts";
import { CardsRow } from "@/components/feed/CardsRow";
import { GetStartedCard } from "@/components/feed/GetStartedCard";

export function FeedList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useFeed();
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Explore content (people, groups, trending) is dropped between posts in a random order, fixed for this visit.
  const insertOrder = useMemo<InsertKind[]>(() => {
    const k: Exclude<InsertKind, "tournaments" | "winners">[] = ["players", "leagues", "groups", "trending"]; // tournaments are scheduled separately, more often
    for (let i = k.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [k[i], k[j]] = [k[j], k[i]];
    }
    return ["winners", ...k]; // winners always come first so people see them early
  }, []);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="-mx-4 flex flex-col md:mx-0">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-72 animate-pulse border-b border-border bg-card" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-signal-red">Couldn&apos;t load the feed. Check your Firebase config and try again.</p>;
  }

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];
  // Posted player cards go in small rows of five: the first after the 3rd post, then another every few posts.
  const cardPosts = allPosts.filter((p) => p.card);
  const cardRows: typeof cardPosts[] = [];
  for (let k = 0; k < cardPosts.length; k += 5) cardRows.push(cardPosts.slice(k, k + 5));
  const CARD_FIRST = 2; // index of the 3rd post
  const CARD_EVERY = 6;
  const posts = allPosts.filter((p) => !p.card);
  const seen = new Set(allPosts.map((p) => p.id));

  if (allPosts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <GetStartedCard />
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-steel/50">No posts yet. Be the first to drop a play.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 flex flex-col md:mx-0 md:overflow-hidden md:rounded-2xl md:border md:border-border">
      <div className="px-4 pb-3 empty:hidden md:px-3"><GetStartedCard /></div>
      {posts.map((post, i) => {
        return (
          <div key={post.id} className="flex flex-col">
            <PostCard post={post} />
            {i >= CARD_FIRST && (i - CARD_FIRST) % CARD_EVERY === 0 && cardRows[(i - CARD_FIRST) / CARD_EVERY] && (
              <CardsRow posts={cardRows[(i - CARD_FIRST) / CARD_EVERY]} />
            )}
            {i % 6 === 0 && <ExploreInsert kind="tournaments" seen={seen} />}
            {i % 6 === 3 && <ExploreInsert kind={insertOrder[Math.floor(i / 6) % insertOrder.length]} seen={seen} />}
          </div>
        );
      })}
      {posts.length <= CARD_FIRST && cardRows[0] && <CardsRow posts={cardRows[0]} />}
      <div ref={sentinelRef} className="h-8" />
      {isFetchingNextPage && <p className="text-center text-xs text-steel/40">Loading more…</p>}
    </div>
  );
}
