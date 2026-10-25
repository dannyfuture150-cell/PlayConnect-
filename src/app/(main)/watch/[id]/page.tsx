"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Heart, MessageCircle, Share2, Volume2, VolumeX, X } from "lucide-react";
import { db } from "@/lib/firebase/client";
import type { Post } from "@/types";
import { useFeed, useToggleLike, subscribeToLikeStatus, recordShare } from "@/hooks/usePosts";
import { useLiveAuthor } from "@/hooks/useProfile";
import { useAuth } from "@/providers/AuthProvider";
import { FollowPill } from "@/components/shared/FollowPill";
import { VideoSurface } from "@/components/shared/VideoSurface";
import { CommentSection } from "@/components/feed/CommentSection";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { videoPoster } from "@/lib/firebase/storage-helpers";
import { formatCount, cn } from "@/lib/utils";

function Reel({
  post, active, near, muted, onEnded, onOpenComments,
}: { post: Post; active: boolean; near: boolean; muted: boolean; onEnded: () => void; onOpenComments: (p: Post) => void }) {
  const { profile } = useAuth();
  const { data: live } = useLiveAuthor(post.authorId);
  const author = live ?? post.author;
  const [liked, setLiked] = useState(false);
  const [delta, setDelta] = useState(0);
  const toggleLike = useToggleLike(post.id, post.authorId, profile?.uid ?? "");

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeToLikeStatus(post.id, profile.uid, setLiked);
  }, [post.id, profile?.uid]);

  function setLike(currentlyLiked: boolean) {
    if (!profile) return;
    setLiked(!currentlyLiked);
    setDelta((d) => d + (currentlyLiked ? -1 : 1));
    toggleLike.mutate({
      currentlyLiked,
      liker: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
    });
  }

  async function share() {
    const url = `${window.location.origin}/posts/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: `${author.displayName} on PlayConnect`, text: post.text, url });
      else await navigator.clipboard.writeText(url);
      await recordShare(post.id);
    } catch {}
  }

  return (
    <section data-reel className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black">
      {near ? (
        <VideoSurface
          src={post.mediaUrls[0]}
          poster={videoPoster(post.mediaUrls[0])}
          active={active}
          muted={muted}
          onEnded={onEnded}
          onDoubleTap={() => !liked && setLike(false)}
          className="h-full w-full"
          videoClassName="h-full"
          seekClassName="bottom-0"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={videoPoster(post.mediaUrls[0])} alt="" className="h-full w-full object-contain" />
      )}

      {/* bottom: author + caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 pb-8 pt-20 pr-20">
        <div className="pointer-events-auto flex items-center gap-2.5">
        <Link href={`/profile/${author.username}`} className="flex items-center gap-2.5">
          <Avatar className="h-10 w-10 border border-white/40">
            <AvatarImage src={author.photoURL ?? undefined} alt={author.displayName} />
            <AvatarFallback>{author.displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-base font-bold text-white">{author.displayName}</span>
        </Link>
        <FollowPill targetUid={post.authorId} onVideo className="ml-1" />
        </div>
        {post.text && <p className="mt-2 line-clamp-3 text-[15px] font-semibold text-white">{post.text}</p>}
      </div>

      {/* right rail */}
      <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-5 text-white">
        <button type="button" onClick={() => setLike(liked)} className="flex flex-col items-center gap-1">
          <Heart className={cn("h-8 w-8 drop-shadow", liked && "fill-signal-red text-signal-red")} />
          <span className="text-xs font-semibold">{formatCount(Math.max(0, post.likesCount + delta))}</span>
        </button>
        <button type="button" onClick={() => onOpenComments(post)} className="flex flex-col items-center gap-1">
          <MessageCircle className="h-8 w-8 drop-shadow" />
          <span className="text-xs font-semibold">{formatCount(post.commentsCount)}</span>
        </button>
        <button type="button" onClick={share} className="flex flex-col items-center gap-1">
          <Share2 className="h-7 w-7 drop-shadow" />
          <span className="text-xs font-semibold">Share</span>
        </button>
      </div>
    </section>
  );
}

export default function WatchPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [skipFirst] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("next") === "1");
  const feed = useFeed();
  const [muted, setMuted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const startQ = useQuery<Post | null>({
    queryKey: ["post", params.id],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "posts", params.id));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Post) : null;
    },
  });

  // Start with the video that was tapped, then keep going through the feed's videos.
  const videos = useMemo(() => {
    const all = (feed.data?.pages.flatMap((p) => p.posts) ?? []).filter((p) => p.mediaType === "video" && p.mediaUrls?.length);
    const idx = all.findIndex((p) => p.id === params.id);
    if (idx >= 0) return all.slice(skipFirst ? idx + 1 : idx);
    const start = !skipFirst && startQ.data && startQ.data.mediaType === "video" ? [startQ.data] : [];
    return [...start, ...all];
  }, [feed.data, startQ.data, params.id, skipFirst]);

  // Which reel is on screen?
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setActiveIndex(Number((e.target as HTMLElement).dataset.index));
          }
        });
      },
      { root, threshold: [0.6] }
    );
    root.querySelectorAll("[data-reel-wrap]").forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [videos.length]);

  // Near the end? Load more videos.
  useEffect(() => {
    if (videos.length > 0 && activeIndex >= videos.length - 3 && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }, [activeIndex, videos.length, feed]);

  function goNext(i: number) {
    const next = scroller.current?.querySelectorAll("[data-reel-wrap]")[i + 1] as HTMLElement | undefined;
    next?.scrollIntoView({ behavior: "smooth" });
  }

  const loading = (feed.isLoading || startQ.isLoading) && videos.length === 0;

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <div ref={scroller} className="h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain">
        {videos.map((p, i) => (
          <div key={p.id} data-reel-wrap data-index={i} className="h-[100dvh] w-full snap-start">
            <Reel
              post={p}
              active={i === activeIndex && !commentsFor}
              near={Math.abs(i - activeIndex) <= 1}
              muted={muted}
              onEnded={() => goNext(i)}
              onOpenComments={setCommentsFor}
            />
          </div>
        ))}
        {!loading && videos.length > 0 && !feed.hasNextPage && (
          <div className="flex h-[60dvh] snap-start flex-col items-center justify-center gap-3 text-center text-white">
            <p className="text-lg font-bold">You&apos;re all caught up 🎮</p>
            <button type="button" onClick={() => router.back()} className="rounded-full bg-white/15 px-5 py-2 text-sm font-semibold">
              Back to feed
            </button>
          </div>
        )}
        {loading && <div className="flex h-full items-center justify-center text-sm text-white/70">Loading videos…</div>}
        {!loading && videos.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-white/70">No videos to show.</div>
        )}
      </div>

      <button type="button" aria-label="Back" onClick={() => router.back()} className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted((m) => !m)} className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {commentsFor && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/50" onClick={() => setCommentsFor(null)}>
          <div className="max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-card p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-bold text-foreground">Comments</span>
              <button type="button" aria-label="Close comments" onClick={() => setCommentsFor(null)} className="text-steel/60"><X className="h-5 w-5" /></button>
            </div>
            <CommentSection postId={commentsFor.id} postAuthorId={commentsFor.authorId} />
          </div>
        </div>
      )}
    </div>
  );
}
