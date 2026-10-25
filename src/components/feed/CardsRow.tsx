"use client";

import Link from "next/link";
import { FlipCard } from "@/components/feed/FlipCard";
import type { Post } from "@/types";

/** Posted player cards shown side by side in one scrolling row (instead of one big post each). */
export function CardsRow({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="border-b border-border py-3">
      <div className="flex items-center justify-between px-4 pb-2 md:px-3">
        <h3 className="font-display text-base font-bold">Player cards 🎴</h3>
        <span className="text-[11px] text-steel/50">Tap a card to flip it</span>
      </div>
      <div data-noswipe className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none md:px-3">
        {posts.map((p) => (
          <div key={p.id} className="flex shrink-0 flex-col items-center gap-1.5">
            <FlipCard card={p.card!} className="w-36" />
            <Link href={`/profile/${p.author.username}`} className="max-w-[9rem] truncate text-[11px] text-steel/60">
              @{p.author.username}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
