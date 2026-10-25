"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format, isToday, isYesterday } from "date-fns";
import { Flag, Heart, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import {
  useActiveStories,
  useCreateStory,
  useDeleteStory,
  useMarkStoryViewed,
  useToggleStoryLike,
  type StoryGroup,
} from "@/hooks/useStories";
import type { Story } from "@/types";
import { RetryVideo } from "@/components/shared/RetryVideo";
import { isVideoFile, validateImageFile, validateVideoFile } from "@/lib/firebase/storage-helpers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatCount } from "@/lib/utils";
import { reportStory } from "@/hooks/useAdmin";

const STORY_REPORT_REASONS = ["Inappropriate content", "Harassment or hate", "Spam or scam", "Violence or something harmful", "Pretending to be someone else"];

/** WhatsApp-style time: "Today, 8:18 PM" / "Yesterday, 9:02 AM". */
function storyTime(story: Story): string {
  const d = story.createdAt?.toDate?.();
  if (!d) return "Just now";
  const t = format(d, "h:mm a");
  if (isToday(d)) return `Today, ${t}`;
  if (isYesterday(d)) return `Yesterday, ${t}`;
  return `${format(d, "d MMM")}, ${t}`;
}

/**
 * WhatsApp-style ring: one arc per story. Arcs for stories you have already
 * seen turn grey; new ones stay colourful. Replaces the old number badge.
 */
function StoryRing({ count, seen, uid }: { count: number; seen: boolean[]; uid: string }) {
  const SIZE = 72;
  const R = 34;
  const C = 2 * Math.PI * R;
  const gap = count > 1 ? 10 : 0; // degrees between arcs
  const arc = 360 / count - gap;
  const len = (arc / 360) * C;
  const id = `ring-${uid}`;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "hsl(var(--violet))" }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--cyan))" }} />
        </linearGradient>
      </defs>
      {Array.from({ length: count }).map((_, i) => (
        <circle
          key={i}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${len} ${C - len}`}
          transform={`rotate(${-90 + i * (360 / count) + gap / 2} ${SIZE / 2} ${SIZE / 2})`}
          stroke={seen[i] ? "hsl(var(--muted-foreground) / 0.45)" : `url(#${id})`}
        />
      ))}
    </svg>
  );
}

export function StoriesRow() {
  const { profile } = useAuth();
  const { data: groups } = useActiveStories();
  const createStory = useCreateStory();
  const deleteStory = useDeleteStory();
  const markViewed = useMarkStoryViewed();
  const toggleLike = useToggleStoryLike();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [groupIdx, setGroupIdx] = useState<number | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 for the active story
  const [paused, setPaused] = useState(false);
  const [reportStep, setReportStep] = useState<"closed" | "choosing" | "done" | "error">("closed");
  const videoRef = useRef<HTMLVideoElement>(null);
  const pointerRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const lastTapRef = useRef(0);

  // Opened from someone's profile picture (?story=<uid>): jump straight into their story.
  useEffect(() => {
    if (!groups || !profile) return;
    const target = new URLSearchParams(window.location.search).get("story");
    if (!target) return;
    window.history.replaceState(null, "", window.location.pathname);
    const gi = [...groups].sort((a, b) => (a.author.uid === profile.uid ? -1 : b.author.uid === profile.uid ? 1 : 0)).findIndex((g) => g.author.uid === target);
    if (gi >= 0) {
      setGroupIdx(gi);
      setStoryIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, profile?.uid]);

  const myGroup = groups?.find((g) => g.author.uid === profile?.uid);
  const otherGroups = groups?.filter((g) => g.author.uid !== profile?.uid) ?? [];
  const allGroups: StoryGroup[] = [...(myGroup ? [myGroup] : []), ...otherGroups];
  const viewing = groupIdx !== null ? allGroups[groupIdx] ?? null : null;
  const activeStory = viewing?.stories[storyIndex];
  const hasLiked = !!profile && !!activeStory?.likes?.includes(profile.uid);
  const isOwnStory = !!profile && viewing?.author.uid === profile.uid;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;

    const isVideo = isVideoFile(file);
    const err = isVideo ? await validateVideoFile(file, 180) : validateImageFile(file);
    if (err) {
      setUploadError(err);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      await createStory.mutateAsync({
        file,
        author: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
      });
    } catch (err) {
      setUploadError((err as Error).message || "Couldn't post that story.");
    } finally {
      setUploading(false);
    }
  }

  const hasSeen = (st: { viewers?: string[] }) => !!profile && !!st.viewers?.includes(profile.uid);
  // Where to start a person's stories: their first one you haven't watched yet.
  function firstUnseen(g: StoryGroup) {
    if (g.author.uid === profile?.uid) return 0;
    const i = g.stories.findIndex((st) => !hasSeen(st));
    return i < 0 ? 0 : i;
  }
  const fullySeen = (g: StoryGroup) => g.author.uid !== profile?.uid && g.stories.every(hasSeen);

  function openViewer(group: StoryGroup, index?: number) {
    const gi = allGroups.findIndex((g) => g.author.uid === group.author.uid);
    if (gi < 0) return;
    setGroupIdx(gi);
    setStoryIndex(index ?? firstUnseen(group));
    setConfirmingDelete(false);
  }

  function closeViewer() {
    setReportStep("closed");
    setGroupIdx(null);
    setProgress(0);
  }

  function handleMyAvatarTap() {
    // If you already have active stories, tapping the circle views them
    // (where the delete option lives) — the small "+" badge is the
    // dedicated control for adding a new one instead.
    if (myGroup) openViewer(myGroup);
    else fileInputRef.current?.click();
  }

  function goToGroup(gi: number, si = 0) {
    if (gi < 0 || gi >= allGroups.length) return closeViewer();
    setGroupIdx(gi);
    setStoryIndex(si);
    setProgress(0);
    setConfirmingDelete(false);
    setReportStep("closed");
  }

  function goNext() {
    if (!viewing || groupIdx === null) return;
    if (storyIndex < viewing.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
    } else {
      // Roll into the next person who has stories you haven't seen, or close at the end.
      let gi = groupIdx + 1;
      while (gi < allGroups.length && fullySeen(allGroups[gi])) gi++;
      goToGroup(gi, gi < allGroups.length ? firstUnseen(allGroups[gi]) : 0);
    }
  }

  function goPrev() {
    if (!viewing || groupIdx === null) return;
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      const prev = allGroups[groupIdx - 1];
      goToGroup(groupIdx - 1, prev.stories.length - 1);
    } else {
      setProgress(0);
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }

  // Mark the story as seen as soon as it appears.
  useEffect(() => {
    if (activeStory && profile) markViewed.mutate({ storyId: activeStory.id, uid: profile.uid });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStory?.id]);

  // Auto-advance timer for photo / text stories (videos drive progress themselves).
  useEffect(() => {
    if (!activeStory || activeStory.mediaType === "video" || paused || confirmingDelete || reportStep !== "closed") return;
    const DURATION = 5000;
    const started = Date.now() - progress * DURATION;
    const id = setInterval(() => {
      const p = (Date.now() - started) / DURATION;
      if (p >= 1) {
        clearInterval(id);
        goNext();
      } else {
        setProgress(p);
      }
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStory?.id, paused, confirmingDelete, reportStep]);

  // Hold to pause videos too.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused || confirmingDelete || reportStep !== "closed") v.pause();
    else v.play().catch(() => {});
  }, [paused, confirmingDelete, reportStep, activeStory?.id]);

  function handlePointerDown(e: React.PointerEvent) {
    pointerRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setPaused(true);
  }

  function handlePointerUp(e: React.PointerEvent) {
    const start = pointerRef.current;
    pointerRef.current = null;
    setPaused(false);
    if (!start || groupIdx === null) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const held = Date.now() - start.t;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      // Swipe: left = next person, right = previous person
      if (dx < 0) goToGroup(groupIdx + 1);
      else if (groupIdx > 0) goToGroup(groupIdx - 1);
      return;
    }
    if (dy > 90) return closeViewer(); // swipe down to close
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12 || held > 300) return; // long press = just a pause

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    if (rel < 0.3) goPrev();
    else if (rel > 0.7) goNext();
    else handleCenterTap();
  }

  function handleLikeToggle() {
    if (!profile || !activeStory) return;
    toggleLike.mutate({ storyId: activeStory.id, uid: profile.uid, currentlyLiked: hasLiked });
  }

  function handleCenterTap() {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;

    if (isDoubleTap && profile && activeStory && !hasLiked) {
      // Double tap only ever *likes* (matches Instagram's behavior — a
      // second double-tap doesn't unlike); the heart button below handles
      // unliking explicitly instead.
      toggleLike.mutate({ storyId: activeStory.id, uid: profile.uid, currentlyLiked: false });
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 700);
    }
  }

  async function handleDeleteStory() {
    if (!activeStory) return;
    await deleteStory.mutateAsync(activeStory.id);
    setConfirmingDelete(false);
    if (viewing && viewing.stories.length <= 1) {
      closeViewer();
    } else {
      setStoryIndex((i) => Math.max(0, Math.min(i, (viewing?.stories.length ?? 2) - 2)));
      setProgress(0);
    }
  }

  if (!profile) return null;

  return (
    <>
      <div className="-mx-4 flex w-[calc(100%+2rem)] max-w-none min-w-0 gap-3.5 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:w-full md:px-0">
        <div className="flex flex-col items-center gap-1.5">
          <button onClick={handleMyAvatarTap} className="relative h-[100px] w-[100px]" disabled={uploading}>
            {myGroup && <StoryRing count={myGroup.stories.length} seen={myGroup.stories.map(() => false)} uid="me" />}
            <Avatar className={cn("absolute left-1/2 top-1/2 h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2", !myGroup && "ring-2 ring-border")}>
              <AvatarImage
                src={(myGroup?.stories[0]?.mediaType === "image" ? myGroup.stories[0].mediaUrl : profile.photoURL) ?? undefined}
                alt={profile.displayName}
              />
              <AvatarFallback>{profile.displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-white ring-2 ring-background"
            >
              <Plus className="h-3.5 w-3.5" />
            </span>
          </button>
          <span className="max-w-[96px] truncate text-[13px] text-steel/60">
            {uploading ? "Uploading…" : "Your story"}
          </span>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

        {otherGroups.map((group) => (
          <button key={group.author.uid} onClick={() => openViewer(group)} className="relative flex flex-col items-center gap-1.5">
            <div className="relative h-[100px] w-[100px]">
              <StoryRing
                count={group.stories.length}
                seen={group.stories.map((st) => !!profile && !!st.viewers?.includes(profile.uid))}
                uid={group.author.uid}
              />
              <Avatar className="absolute left-1/2 top-1/2 h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2">
                <AvatarImage src={group.author.photoURL ?? undefined} alt={group.author.displayName} />
                <AvatarFallback>{group.author.displayName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <span className="max-w-[96px] truncate text-[13px] text-steel/60">{group.author.displayName}</span>
          </button>
        ))}
      </div>

      {uploadError && <p className="mt-1.5 text-xs text-signal-red">{uploadError}</p>}

      {viewing && activeStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90">
          <button onClick={closeViewer} className="absolute right-4 top-[calc(1.25rem+env(safe-area-inset-top))] z-40 text-white">
            <X className="h-6 w-6" />
          </button>

          <div className="relative h-[100dvh] w-full max-w-md overflow-hidden bg-slate-900 sm:h-[92vh] sm:rounded-2xl">
            {/* Progress segments — one per story in this person's group */}
            <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
              {viewing.stories.map((s, i) => (
                <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full bg-white"
                    style={{ width: `${i < storyIndex ? 100 : i === storyIndex ? progress * 100 : 0}%` }}
                  />
                </div>
              ))}
            </div>

            {/* Gesture layer: tap left/right = prev/next, center double-tap = like,
                hold = pause, swipe sideways = switch person, swipe down = close */}
            <div
              className="absolute inset-0 z-10 touch-none select-none"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => {
                pointerRef.current = null;
                setPaused(false);
              }}
            />

            {activeStory.mediaType === "video" ? (
              <RetryVideo
                key={activeStory.id}
                ref={videoRef}
                src={activeStory.mediaUrl ?? ""}
                autoPlay
                playsInline
                onLoadedData={(e) => {
                  // Some phones block un-muted autoplay after the first story; fall back to muted so it still plays and advances.
                  const v = e.currentTarget;
                  v.play().catch(() => {
                    v.muted = true;
                    v.play().catch(() => {});
                  });
                }}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration) setProgress(v.currentTime / v.duration);
                }}
                onEnded={goNext}
                className="h-full w-full object-contain"
              />
            ) : activeStory.mediaType === "text" ? (
              <div
                className="flex h-full w-full items-center justify-center p-8 text-center"
                style={{ background: activeStory.backgroundStyle || "#1E293B" }}
              >
                <p
                  className="whitespace-pre-wrap text-2xl font-bold"
                  style={{ fontFamily: activeStory.fontFamily, color: activeStory.textColor || "#FFFFFF" }}
                >
                  {activeStory.text}
                </p>
              </div>
            ) : (
              <Image key={activeStory.id} src={activeStory.mediaUrl ?? ""} alt="" fill className="object-contain" />
            )}

            {showHeartBurst && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <Heart className="h-28 w-28 animate-[ping_0.6s_ease-out] fill-signal-red text-signal-red drop-shadow-[0_0_20px_rgba(248,113,113,0.6)]" />
              </div>
            )}

            <div className="pointer-events-none absolute left-0 top-[calc(1rem+env(safe-area-inset-top))] z-20 flex w-full items-center justify-between gap-2 bg-gradient-to-b from-slate-950/70 to-transparent p-3 pr-14">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={viewing.author.photoURL ?? undefined} alt={viewing.author.displayName} />
                  <AvatarFallback>{viewing.author.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium text-white">{viewing.author.displayName}</span>
                  <span className="text-[11px] text-white/70">{storyTime(activeStory)}</span>
                </div>
              </div>

              {isOwnStory && (
                confirmingDelete ? (
                  <div className="pointer-events-auto z-30 flex items-center gap-1.5">
                    <button
                      onClick={handleDeleteStory}
                      disabled={deleteStory.isPending}
                      className="rounded-full bg-signal-red/90 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-signal-red"
                    >
                      {deleteStory.isPending ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      className="rounded-full bg-slate-950/50 px-2.5 py-1 text-[11px] font-medium text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="pointer-events-auto z-30 rounded-full bg-slate-950/50 p-2 text-white hover:bg-signal-red/80"
                    title="Delete story"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )
              )}
              {!isOwnStory && profile && (
                <button
                  onClick={() => setReportStep("choosing")}
                  className="pointer-events-auto z-30 rounded-full bg-slate-950/50 p-2 text-white"
                  title="Report story"
                  aria-label="Report story"
                >
                  <Flag className="h-4 w-4" />
                </button>
              )}
            </div>

            {reportStep !== "closed" && (
              <div className="absolute inset-0 z-40 flex items-end bg-black/60" onClick={() => setReportStep("closed")}>
                <div className="w-full rounded-t-2xl bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
                  {reportStep === "choosing" ? (
                    <>
                      <p className="mb-2 text-sm font-semibold text-foreground">Why are you reporting this story?</p>
                      {STORY_REPORT_REASONS.map((reason) => (
                        <button
                          key={reason}
                          className="block w-full rounded-lg px-3 py-3 text-left text-sm text-steel/80 hover:bg-muted"
                          onClick={() => {
                            if (!profile) return;
                            reportStory({ reporterId: profile.uid, storyId: activeStory.id, authorId: viewing.author.uid, reason })
                              .then(() => setReportStep("done"))
                              .catch(() => setReportStep("error"));
                          }}
                        >
                          {reason}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      <p className="py-2 text-sm text-foreground">
                        {reportStep === "done" ? "Thanks — we'll review this story." : "Couldn't send the report. Try again later."}
                      </p>
                      <button className="mt-2 w-full rounded-full bg-foreground py-2.5 text-sm font-semibold text-background" onClick={() => setReportStep("closed")}>
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute bottom-0 left-0 z-20 flex w-full items-center justify-between bg-gradient-to-t from-slate-950/70 to-transparent p-3">
              <p className="text-[11px] text-white/50">
                {isOwnStory ? "Only you can see likes" : "Tap sides · swipe · double-tap to like"}
              </p>
              {isOwnStory ? (
                <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-slate-950/50 px-3 py-1.5 text-white">
                  <Heart className="h-4 w-4 fill-signal-red text-signal-red" />
                  <span className="text-xs font-medium">{formatCount(activeStory.likes?.length ?? 0)}</span>
                </div>
              ) : (
                <button
                  onClick={handleLikeToggle}
                  aria-label={hasLiked ? "Unlike story" : "Like story"}
                  className="pointer-events-auto flex items-center rounded-full bg-slate-950/50 p-2 text-white"
                >
                  <Heart className={cn("h-5 w-5", hasLiked && "fill-signal-red text-signal-red")} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
