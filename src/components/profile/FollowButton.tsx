"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { useIsFollowing, useToggleFollow } from "@/hooks/useFollow";

export function FollowButton({ targetUid }: { targetUid: string }) {
  const { profile } = useAuth();
  const isFollowing = useIsFollowing(targetUid, profile?.uid);
  const toggleFollow = useToggleFollow(
    targetUid,
    profile
      ? { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL }
      : null
  );

  if (!profile || profile.uid === targetUid) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={isFollowing ? "outline" : "default"}
        onClick={() => toggleFollow.mutate(isFollowing)}
        disabled={toggleFollow.isPending}
      >
        {isFollowing ? "Following" : "Follow"}
      </Button>
      {toggleFollow.isError && (
        <p className="text-[11px] text-signal-red">Couldn&apos;t update — check Firestore rules are up to date.</p>
      )}
    </div>
  );
}
