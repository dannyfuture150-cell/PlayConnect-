"use client";

import { useState } from "react";
import { Check, Newspaper, Share2 } from "lucide-react";
import type { UserProfile } from "@/types";
import { sharePlayerCard } from "@/lib/playerCardImage";
import { makeCardSnapshot } from "@/lib/playerCardSnapshot";
import { titleText } from "@/lib/starsCatalog";
import { useStars } from "@/hooks/useStars";
import { useCreatePost } from "@/hooks/usePosts";
import { cn } from "@/lib/utils";

/** "Share my card": post it on the PlayConnect feed, or send it to WhatsApp, TikTok and other apps. */
export function SharePlayerCardButton({
  profile,
  tournamentTitle,
  game,
  headline,
  className,
  secondaryClassName,
  label = "Share my player card",
}: {
  profile: UserProfile;
  tournamentTitle?: string;
  game?: string;
  headline?: string; // custom ribbon text, e.g. "⬆ Promoted to Pro"
  className?: string;
  secondaryClassName?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState<"share" | "post" | null>(null);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createPost = useCreatePost();
  const stars = useStars(profile.uid);

  async function postToFeed() {
    setBusy("post");
    setError(null);
    try {
      await createPost.mutateAsync({
        text: headline ? `${headline}! Here's my player card.` : tournamentTitle ? `🏆 I just won ${tournamentTitle}! Here's my player card.` : "My PlayConnect player card 🎮",
        gameTag: game || undefined,
        card: makeCardSnapshot(profile, { headline, tournamentTitle, game, style: stars.equipped.cardstyle, title: titleText(stars.equipped.title) }),
        author: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
      });
      setPosted(true);
    } catch (e) {
      setError((e as Error).message || "Couldn't post it. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const base = "flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-400/60 py-3 text-sm font-bold text-yellow-300 active:scale-95 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy !== null}
        onClick={async () => {
          setBusy("share");
          try {
            await sharePlayerCard(profile, { tournamentTitle, game, headline });
          } finally {
            setBusy(null);
          }
        }}
        className={cn(base, className)}
      >
        <Share2 className="h-4 w-4" />
        {busy === "share" ? "Making your card…" : label}
      </button>
      <button
        type="button"
        disabled={busy !== null || posted}
        onClick={postToFeed}
        className={cn(base, secondaryClassName)}
      >
        {posted ? <Check className="h-4 w-4" /> : <Newspaper className="h-4 w-4" />}
        {posted ? "Posted on your feed!" : busy === "post" ? "Posting…" : "Post on PlayConnect feed"}
      </button>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
