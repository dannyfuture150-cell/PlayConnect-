"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { REACTION_EMOJIS, useAnnouncementReactions } from "@/hooks/useAnnouncementReactions";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

/** Emoji reactions under an announcement. Members tap to react; everyone sees the counts. */
export function AnnouncementReactions({
  communityId,
  announcementId,
  isMember,
}: {
  communityId: string;
  announcementId: string;
  isMember: boolean;
}) {
  const { profile } = useAuth();
  const { reactions, react } = useAnnouncementReactions(communityId, announcementId);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = new Map<string, number>();
  (Object.values(reactions) as string[]).forEach((e) => counts.set(e, (counts.get(e) ?? 0) + 1));
  const mine = profile ? reactions[profile.uid] : undefined;
  const shown = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  async function pick(emoji: string) {
    if (!profile || !isMember) return;
    setError(null);
    setPicking(false);
    try {
      await react(profile.uid, emoji);
    } catch {
      setError("Couldn't save your reaction. Try again.");
    }
  }

  if (shown.length === 0 && !isMember) return null;

  return (
    <div className="px-4 pb-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.map(([emoji, n]) => (
          <button
            key={emoji}
            type="button"
            disabled={!isMember}
            onClick={() => pick(emoji)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm",
              mine === emoji ? "border-violet bg-violet/15 text-foreground" : "border-border bg-muted text-steel/80"
            )}
          >
            <span>{emoji}</span>
            <span className="text-xs font-semibold">{n}</span>
          </button>
        ))}
        {isMember && (
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            aria-label="Add a reaction"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-steel/60 hover:bg-muted"
          >
            <SmilePlus className="h-4 w-4" />
          </button>
        )}
      </div>
      {picking && (
        <div className="mt-2 flex w-fit gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-md">
          {REACTION_EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => pick(e)} className="rounded-full px-1.5 py-1 text-xl active:scale-90">
              {e}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-signal-red">{error}</p>}
    </div>
  );
}
