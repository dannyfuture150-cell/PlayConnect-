"use client";

import { Framed } from "@/components/stars/Framed";
import { PlayerName } from "@/components/stars/PlayerName";
import { StoryRing } from "@/components/shared/StoryRing";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Post } from "@/types";
import { useDeletePost, useToggleLike, useToggleSave, recordShare, subscribeToLikeStatus } from "@/hooks/usePosts";
import { useLiveAuthor } from "@/hooks/useProfile";
import { reportPost } from "@/hooks/useAdmin";
import { useAuth } from "@/providers/AuthProvider";
import { formatCount, cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FlipCard } from "@/components/feed/FlipCard";
import { VideoSurface } from "@/components/shared/VideoSurface";
import { Linkify } from "@/components/shared/Linkify";
import { MediaLightbox } from "@/components/shared/MediaLightbox";
import { videoPoster } from "@/lib/firebase/storage-helpers";
import { VerifiedTick } from "@/components/shared/VerifiedBadge";
import { FollowPill } from "@/components/shared/FollowPill";
import { ShareSheet } from "@/components/feed/ShareSheet";
import { CommentSection } from "@/components/feed/CommentSection";

export function PostCard({ post }: { post: Post }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const toggleLike = useToggleLike(post.id, post.authorId, profile?.uid ?? "");
  const toggleSave = useToggleSave(post.id, profile?.uid);
  const deletePost = useDeletePost();
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  function goTo(i: number) {
    const el = carouselRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }
  const lastTapRef = useRef(0);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  // Saved state lives on the user's own live profile (already synced via
  // onSnapshot in AuthProvider) rather than a separate subscription.
  const isSaved = !!profile?.savedPostIds?.includes(post.id);

  // Falls back to the stored snapshot (post.author) while this loads, or if
  // the lookup fails — so a post never shows blank while fetching.
  const { data: liveAuthor } = useLiveAuthor(post.authorId);
  const author = liveAuthor ?? post.author;

  const isOwner = profile?.uid === post.authorId;
  const [reportState, setReportState] = useState<"idle" | "choosing" | "done">("idle");

  useEffect(() => {
    if (!profile?.uid) return;
    return subscribeToLikeStatus(post.id, profile.uid, setLiked);
  }, [post.id, profile?.uid]);

  async function handleDelete() {
    await deletePost.mutateAsync({ postId: post.id, authorId: post.authorId });
  }

  // Double-tap only ever *likes* (like Instagram); the heart button unlikes.
  function likeFromDoubleTap() {
    if (profile && !liked) {
      toggleLike.mutate({
        currentlyLiked: false,
        liker: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
      });
      setLiked(true);
    }
  }

  function handleMediaDoubleTap() {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;

    // One tap opens the photo full screen (after waiting to see if it becomes a double tap).
    if (openTimer.current) clearTimeout(openTimer.current);
    if (!isDoubleTap) {
      openTimer.current = setTimeout(() => setViewerUrl(post.mediaUrls[imageIndex] ?? post.mediaUrls[0]), 300);
    }

    if (isDoubleTap && profile && !liked) {
      // Double tap only ever *likes* (matches Instagram's behavior — a
      // second double-tap doesn't unlike); the heart button below still
      // handles unliking explicitly.
      toggleLike.mutate({
        currentlyLiked: false,
        liker: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
      });
      setLiked(true);
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 700);
    }
  }

  return (
    <article className="overflow-hidden border-b border-border bg-card">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Link href={`/profile/${author.username}`}>
          <Framed uid={post.authorId}><StoryRing uid={post.authorId}>
          <Avatar className="h-9 w-9">
            <AvatarImage src={author.photoURL ?? undefined} alt={author.displayName} />
            <AvatarFallback>{author.displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          </StoryRing></Framed>
        </Link>
        <div className="flex-1">
          <Link href={`/profile/${author.username}`} className="text-sm font-bold text-foreground hover:underline">
            <PlayerName uid={post.authorId} name={author.displayName} />
          </Link>
          <VerifiedTick uid={post.authorId} />
          <p className="text-xs font-medium text-steel/55">
            @{author.username} ·{" "}
            {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : "just now"}
          </p>
        </div>
        <FollowPill targetUid={post.authorId} />
        {post.gameTag && (
          <span className="rounded-full border border-violet/30 bg-violet/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-glow">
            {post.gameTag}
          </span>
        )}

        {!isOwner && profile && (
          <DropdownMenu.Root onOpenChange={(open) => !open && setReportState("idle")}>
            <DropdownMenu.Trigger asChild>
              <button className="rounded-lg p-1.5 text-steel/40 hover:bg-muted hover:text-steel" aria-label="Post options">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" className="z-40 min-w-[200px] rounded-xl border border-border bg-card p-1.5 shadow-2xl">
                {reportState === "done" ? (
                  <p className="p-3 text-xs text-steel/70">Thanks — we&apos;ll take a look.</p>
                ) : reportState === "choosing" ? (
                  <div className="flex flex-col">
                    <p className="px-3 py-1.5 text-xs text-steel/50">Why are you reporting this?</p>
                    {["Spam", "Harassment or hate", "Inappropriate content", "Cheating or scam"].map((reason) => (
                      <DropdownMenu.Item
                        key={reason}
                        onSelect={(e) => {
                          e.preventDefault();
                          reportPost({ reporterId: profile.uid, postId: post.id, reason })
                            .then(() => setReportState("done"))
                            .catch(() => setReportState("idle"));
                        }}
                        className="cursor-pointer rounded-lg px-3 py-2 text-sm text-steel/80 outline-none hover:bg-muted"
                      >
                        {reason}
                      </DropdownMenu.Item>
                    ))}
                  </div>
                ) : (
                  <DropdownMenu.Item
                    onSelect={(e) => {
                      e.preventDefault();
                      setReportState("choosing");
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-steel/80 outline-none hover:bg-muted"
                  >
                    <Flag className="h-4 w-4" />
                    Report post
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}

        {isOwner && (
          <DropdownMenu.Root onOpenChange={(open) => !open && setConfirmingDelete(false)}>
            <DropdownMenu.Trigger asChild>
              <button className="rounded-lg p-1.5 text-steel/40 hover:bg-muted hover:text-steel">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-40 min-w-[160px] rounded-xl border border-border bg-card p-1.5 shadow-2xl"
              >
                {confirmingDelete ? (
                  <div className="flex flex-col gap-1.5 p-1.5">
                    <p className="px-1 text-xs text-steel/60">Delete this post?</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleDelete}
                        disabled={deletePost.isPending}
                        className="flex-1 rounded-lg bg-signal-red/90 px-2 py-1.5 text-xs font-semibold text-white hover:bg-signal-red"
                      >
                        {deletePost.isPending ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmingDelete(false)}
                        className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs font-medium text-steel/70 hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <DropdownMenu.Item
                    onSelect={(e) => {
                      e.preventDefault();
                      setConfirmingDelete(true);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-signal-red outline-none hover:bg-signal-red/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete post
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>

      {post.card && (
        <div className="flex flex-col items-center gap-2 px-4 pb-4 pt-2">
          <FlipCard card={post.card} className="w-44" />
          <p className="text-[11px] text-steel/50">Tap the card to flip it</p>
        </div>
      )}

      {post.text && !(post.mediaUrls?.length > 0) && <div className="flex min-h-[8rem] items-center px-4 pb-8 pt-4"><p className="whitespace-pre-wrap text-[19px] font-extrabold leading-relaxed text-foreground"><Linkify text={post.text} className="break-all font-bold text-violet-glow underline" /></p></div>}

      {post.mediaUrls?.length > 0 && post.mediaType === "video" && (
        <VideoSurface
          src={post.mediaUrls[0]}
          poster={videoPoster(post.mediaUrls[0])}
          autoplayInView
          onDoubleTap={likeFromDoubleTap}
          onExpand={() => router.push(`/watch/${post.id}`)}
          onWatchMore={() => router.push(`/watch/${post.id}?next=1`)}
          className="w-full"
          videoClassName="max-h-[85vh] object-cover"
        />
      )}

      {post.mediaUrls?.length > 0 && post.mediaType !== "video" && (
        <div className="relative w-full cursor-pointer bg-muted" onClick={handleMediaDoubleTap}>
          <div
            ref={carouselRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
              if (i !== imageIndex) setImageIndex(i);
            }}
            className="flex snap-x snap-mandatory items-start overflow-x-auto scrollbar-none"
          >
            {post.mediaUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url + i}
                src={url}
                alt="Post media"
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
                className="block h-auto max-h-[85vh] w-full shrink-0 snap-center object-cover"
              />
            ))}
          </div>

          {post.mediaUrls.length > 1 && (
            <>
              {imageIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(imageIndex - 1);
                  }}
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-950/50 p-1.5 text-white hover:bg-slate-950/70"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {imageIndex < post.mediaUrls.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(imageIndex + 1);
                  }}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-950/50 p-1.5 text-white hover:bg-slate-950/70"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
                {post.mediaUrls.map((_, i) => (
                  <span
                    key={i}
                    className={cn("h-1.5 w-1.5 rounded-full", i === imageIndex ? "bg-white" : "bg-white/40")}
                  />
                ))}
              </div>
              <span className="absolute right-2 top-2 z-10 rounded-full bg-slate-950/50 px-2 py-0.5 text-[11px] font-medium text-white">
                {imageIndex + 1}/{post.mediaUrls.length}
              </span>
            </>
          )}

          {showHeartBurst && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart className="h-24 w-24 animate-[ping_0.6s_ease-out] fill-signal-red text-signal-red drop-shadow-[0_0_20px_rgba(248,113,113,0.6)]" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-0.5 px-1.5 pt-1">
        <ActionButton
          icon={<Heart className={cn("h-7 w-7", liked && "fill-signal-red text-signal-red")} />}
          label={formatCount(post.likesCount)}
          active={liked}
          onClick={() => {
            if (!profile) return;
            setLiked(!liked);
            toggleLike.mutate({
              currentlyLiked: liked,
              liker: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
            });
          }}
        />
        <ActionButton
          icon={<MessageCircle className="h-7 w-7" />}
          label={formatCount(post.commentsCount)}
          onClick={() => setShowComments((s) => !s)}
        />
        <ActionButton
          icon={<Send className="h-7 w-7 -rotate-12" />}
          label={formatCount(post.sharesCount)}
          onClick={() => setShareOpen(true)}
        />
        <ActionButton
          icon={<Bookmark className={cn("h-7 w-7", isSaved && "fill-violet-glow")} />}
          label={formatCount(post.savesCount)}
          active={isSaved}
          activeColor="text-violet-glow"
          onClick={() => profile && toggleSave.mutate(isSaved)}
          className="ml-auto"
        />
      </div>

      {post.text && post.mediaUrls?.length > 0 && (
        <p className="whitespace-pre-wrap px-3 pb-1 pt-0.5 text-[15px] leading-snug text-foreground">
          <Link href={`/profile/${author.username}`} className="mr-1.5 font-bold hover:underline">
            {author.username}
          </Link>
          <Linkify text={post.text} className="break-all font-semibold text-violet-glow underline" />
        </p>
      )}
      {post.commentsCount > 0 && !showComments && (
        <button type="button" onClick={() => setShowComments(true)} className="block px-3 pb-2 text-sm text-steel/55">
          View all {formatCount(post.commentsCount)} comment{post.commentsCount === 1 ? "" : "s"}
        </button>
      )}
      <div className="h-1.5" />

      {viewerUrl && <MediaLightbox url={viewerUrl} type="image" onClose={() => setViewerUrl(null)} />}

      {showComments && <CommentSection postId={post.id} postAuthorId={post.authorId} />}
      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        path={`/posts/${post.id}`}
        title={`${author.displayName} on PlayConnect`}
        text={post.text}
        onShared={() => void recordShare(post.id).catch(() => {})}
      />
    </article>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  active,
  activeColor = "text-signal-red",
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  activeColor?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-base font-semibold transition-colors",
        active ? activeColor : "text-steel/50 hover:bg-muted hover:text-steel",
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}
