"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useIsFollowing, useToggleFollow } from "@/hooks/useFollow";
import { cn } from "@/lib/utils";

/** Small Instagram-style "Follow" button. Disappears once you follow, and never shows on your own posts. */
export function FollowPill({ targetUid, onVideo = false, className }: { targetUid: string; onVideo?: boolean; className?: string }) {
  const { profile } = useAuth();
  const isFollowing = useIsFollowing(targetUid, profile?.uid);
  const toggle = useToggleFollow(
    targetUid,
    profile ? { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL } : null
  );

  if (!profile || profile.uid === targetUid || isFollowing) return null;

  return (
    <button
      type="button"
      disabled={toggle.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate(false);
      }}
      className={cn(
        "pointer-events-auto shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-opacity disabled:opacity-60",
        onVideo ? "border border-white/70 text-white" : "bg-violet text-white",
        className
      )}
    >
      {toggle.isPending ? "…" : "Follow"}
    </button>
  );
}
