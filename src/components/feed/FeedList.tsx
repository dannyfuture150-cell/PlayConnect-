"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFeed } from "@/hooks/usePosts";
import { useAuth } from "@/providers/AuthProvider";
import type { Post } from "@/types";
import { PostCard } from "@/components/feed/PostCard";
import { ExploreInsert, type InsertKind } from "@/components/feed/ExploreInserts";
import { CardsRow } from "@/components/feed/CardsRow";
import { GetStartedCard } from "@/components/feed/GetStartedCard";

/** `afterFirst` (live leagues and tournaments) is shown right after the first post, then the rest of the posts follow. */
const SEEN_KEY = "pc_feed_seen";
const SEEN_MAX = 300;

function loadSeen(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set<string>();
  }
}

/**
 * The feed's random order lives here, outside the component, so it survives moving to another tab and back.
 * It only starts over when the page is refreshed or someone signs in as a different account.
 */
const session: { uid: string | null; keys: Map<string, number>; seen: Set<string> | null; marked: boolean; inserts: InsertKind[] | null } = {
  uid: null,
  keys: new Map(),
  seen: null,
  marked: false,
  inserts: null,
};

export function FeedList({ afterFirst }: { afterFirst?: ReactNode }) {
  const { profile } = useAuth();
  if (profile?.uid && session.uid !== profile.uid) {
    session.uid = profile.uid;
    session.keys = new Map();
    session.seen = null;
    session.marked = false;
    session.inserts = null;
  }
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useFeed();
  // Each visit gets its own random order for the first batch; posts you haven't seen lately come first.

  const sentinelRef = useRef<HTMLDivElement>(null);
  // Explore content (people, groups, trending) is dropped between posts in a random order, fixed for this visit.
  const insertOrder = useMemo<InsertKind[]>(() => {
    if (session.inserts) return session.inserts;
    const k: Exclude<InsertKind, "tournaments" | "winners">[] = ["players", "leagues", "groups", "trending"]; // tournaments are scheduled separately, more often
    for (let i = k.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [k[i], k[j]] = [k[j], k[i]];
    }
    session.inserts = ["winners", ...k]; // winners always come first so people see them early
    return session.inserts;
  }, []);

  let orderedFirst: Post[] = data?.pages[0]?.posts ?? [];
  if (orderedFirst.length > 0) {
    if (!session.seen) session.seen = loadSeen();
    const seen = session.seen;
    const now = Date.now();
    const keyOf = (p: Post) => {
      let k = session.keys.get(p.id);
      if (k === undefined) {
        const mineAndNew = !!profile && p.authorId === profile.uid && now - ((p.createdAt as { toMillis?: () => number } | null)?.toMillis?.() ?? 0) < 10 * 60_000;
        k = mineAndNew ? -1 : (seen.has(p.id) ? 1 : 0) + Math.random();
        session.keys.set(p.id, k);
      }
      return k;
    };
    orderedFirst = [...orderedFirst].sort((a, b) => keyOf(a) - keyOf(b));
  }

  // remember what this visit showed, so the next refresh starts with different posts
  const firstIds = orderedFirst.slice(0, 10).map((p) => p.id).join(",");
  useEffect(() => {
    if (!firstIds || session.marked) return;
    session.marked = true;
    try {
      const all = [...firstIds.split(","), ...Array.from(loadSeen())];
      localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(new Set(all)).slice(0, SEEN_MAX)));
    } catch {
      /* no storage: the feed just isn't remembered */
    }
  }, [firstIds]);

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

  const allPosts = [...orderedFirst, ...(data?.pages.slice(1).flatMap((p) => p.posts) ?? [])];
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
        {afterFirst}
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
            {i === 0 && afterFirst && <div className="flex flex-col gap-5 border-b border-border px-4 py-4 empty:hidden md:px-3">{afterFirst}</div>}
            {i >= CARD_FIRST && (i - CARD_FIRST) % CARD_EVERY === 0 && cardRows[(i - CARD_FIRST) / CARD_EVERY] && (
              <CardsRow posts={cardRows[(i - CARD_FIRST) / CARD_EVERY]} />
            )}
            {i % 6 === 0 && <ExploreInsert kind="tournaments" seen={seen} />}
            {i % 6 === 3 && <ExploreInsert kind={insertOrder[Math.floor(i / 6) % insertOrder.length]} seen={seen} />}
          </div>
        );
      })}
      {posts.length === 0 && afterFirst && <div className="flex flex-col gap-5 px-4 py-4 md:px-3">{afterFirst}</div>}
      {posts.length <= CARD_FIRST && cardRows[0] && <CardsRow posts={cardRows[0]} />}
      <div ref={sentinelRef} className="h-8" />
      {isFetchingNextPage && <p className="text-center text-xs text-steel/40">Loading more…</p>}
    </div>
  );
}
