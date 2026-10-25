"use client";

import { useActiveStories } from "@/hooks/useStories";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * Wraps an avatar in an Instagram-style ring while that person has a live
 * story: coloured if you haven't watched it yet, grey once you have.
 * Renders the avatar untouched when there is no story.
 */
export function StoryRing({ uid, children, className }: { uid: string | undefined; children: React.ReactNode; className?: string }) {
  const { profile } = useAuth();
  const { data: groups } = useActiveStories();
  const group = uid ? groups?.find((g) => g.author.uid === uid) : undefined;
  if (!group) return <>{children}</>;
  const mine = profile?.uid === uid;
  const seen = !mine && !!profile && group.stories.every((s) => s.viewers?.includes(profile.uid));
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full p-[2px]",
        seen ? "bg-steel/30" : "bg-gradient-to-tr from-violet via-fuchsia-500 to-amber-400",
        className
      )}
    >
      <span className="rounded-full bg-background p-[2px]">{children}</span>
    </span>
  );
}

/** True when the person has at least one live story. */
export function useHasStory(uid: string | undefined): boolean {
  const { data: groups } = useActiveStories();
  return !!uid && !!groups?.some((g) => g.author.uid === uid);
}
