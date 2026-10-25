"use client";

import Link from "next/link";
import { Copy, Heart, MessageCircle, Play } from "lucide-react";
import { RANK_THEME } from "@/lib/playerCardSnapshot";
import { videoPoster } from "@/lib/firebase/storage-helpers";
import type { Post } from "@/types";

/** Instagram-style 3-column grid of a player's posts. Tap a tile to open the post. */
export function ProfilePostGrid({ posts }: { posts: Post[] }) {
  return (
    <div className="-mx-4 grid grid-cols-3 gap-0.5 md:mx-0 md:gap-1 md:overflow-hidden md:rounded-xl">
      {posts.map((post) => {
        const media = post.mediaUrls?.[0];
        const isVideo = post.mediaType === "video" || post.mediaType === "clip";
        const thumb = media ? (isVideo ? videoPoster(media) : media) : undefined;
        return (
          <Link key={post.id} href={`/posts/${post.id}`} className="group relative aspect-square overflow-hidden bg-muted">
            {post.card ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-white" style={{ background: `linear-gradient(160deg, ${RANK_THEME[post.card.rank]?.a ?? "#999"}, ${RANK_THEME[post.card.rank]?.b ?? "#333"})` }}>
                <span className="text-xl font-black leading-none">{post.card.reputation}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest">{post.card.rank}</span>
                <span className="text-[10px] opacity-90">🎴 Card</span>
              </div>
            ) : thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : media ? (
              <div className="h-full w-full bg-black" />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-2">
                <p className="line-clamp-5 text-center text-xs font-semibold leading-snug text-foreground">{post.text}</p>
              </div>
            )}

            {isVideo && <Play className="absolute right-1.5 top-1.5 h-4 w-4 fill-white text-white drop-shadow" />}
            {!isVideo && (post.mediaUrls?.length ?? 0) > 1 && <Copy className="absolute right-1.5 top-1.5 h-4 w-4 text-white drop-shadow" />}

            <div className="absolute inset-0 hidden items-center justify-center gap-4 bg-black/45 text-sm font-semibold text-white group-hover:flex">
              <span className="flex items-center gap-1"><Heart className="h-4 w-4 fill-white" />{post.likesCount ?? 0}</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4 fill-white" />{post.commentsCount ?? 0}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
