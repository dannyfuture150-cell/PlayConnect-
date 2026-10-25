"use client";

import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Camera, ImagePlus, Trash2, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useAddShot, useDeleteShot, useTournamentShots } from "@/hooks/useTournamentShots";
import { validateImageFile } from "@/lib/firebase/storage-helpers";
import type { TournamentShot } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/**
 * Screenshot wall for a tournament. Everyone can look; only players who
 * joined (and the organiser) can post — enforced by the Firestore rules and
 * the upload-signing route, not just by hiding the button.
 */
export function TournamentShots({
  tournamentId,
  organizerId,
  participantIds,
}: {
  tournamentId: string;
  organizerId: string;
  participantIds: string[];
}) {
  const { profile } = useAuth();
  const { shots, loading } = useTournamentShots(tournamentId);
  const addShot = useAddShot(tournamentId);
  const deleteShot = useDeleteShot(tournamentId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<TournamentShot | null>(null);

  const isOrganizer = profile?.uid === organizerId;
  const canPost = !!profile && (isOrganizer || participantIds.includes(profile.uid));

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateImageFile(file); // images only
    if (err) return setError(err);
    setError(null);
    if (pending) URL.revokeObjectURL(pending.preview);
    setPending({ file, preview: URL.createObjectURL(file) });
  }

  function cancel() {
    if (pending) URL.revokeObjectURL(pending.preview);
    setPending(null);
    setCaption("");
  }

  async function post() {
    if (!pending || !profile) return;
    setError(null);
    try {
      await addShot.mutateAsync({
        file: pending.file,
        caption,
        author: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
      });
      cancel();
    } catch (e: any) {
      setError(e?.code === "permission-denied" ? "Only players in this tournament can post screenshots." : e?.message || "Couldn't post that screenshot.");
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
            <Camera className="h-4 w-4 text-violet-glow" /> Screenshots
          </h3>
          <p className="text-xs text-steel/60">
            {canPost ? "Share match results and moments from this tournament." : "Only players in this tournament can post here."}
          </p>
        </div>
        {canPost && !pending && (
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-4 w-4" /> Add
          </Button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>

      {pending && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-muted p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pending.preview} alt="" className="max-h-72 w-full rounded-xl object-contain" />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={140}
            placeholder="Add a caption, e.g. Won 3-1 in the semi-final"
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground placeholder:text-steel/40"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={post} disabled={addShot.isPending}>
              {addShot.isPending ? "Posting…" : "Post screenshot"}
            </Button>
            <Button size="sm" variant="outline" onClick={cancel} disabled={addShot.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-signal-red">{error}</p>}

      {loading && <div className="mt-3 h-24 animate-pulse rounded-xl bg-muted" />}
      {!loading && shots.length === 0 && !pending && (
        <p className="mt-3 rounded-xl bg-muted p-4 text-center text-sm text-steel/60">
          No screenshots yet.{canPost ? " Be the first to post one." : ""}
        </p>
      )}

      {shots.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {shots.map((s) => (
            <button key={s.id} onClick={() => setOpen(s)} className="group relative aspect-square overflow-hidden rounded-xl bg-muted text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.imageUrl} alt={s.caption || "Screenshot"} className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-[11px] font-semibold text-white">
                {s.author.displayName}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setOpen(null)}>
          <div className="flex items-center gap-3 p-4" onClick={(e) => e.stopPropagation()}>
            <Link href={`/profile/${open.author.username}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={open.author.photoURL ?? undefined} alt={open.author.displayName} />
                <AvatarFallback>{open.author.displayName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{open.author.displayName}</p>
                <p className="text-xs text-white/60">
                  {open.createdAt?.toDate ? formatDistanceToNow(open.createdAt.toDate(), { addSuffix: true }) : "just now"}
                </p>
              </div>
            </Link>
            {(profile?.uid === open.authorId || isOrganizer) && (
              <button
                onClick={async () => {
                  await deleteShot.mutateAsync(open.id);
                  setOpen(null);
                }}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-red-500/70"
                title="Delete screenshot"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => setOpen(null)} className="rounded-full bg-white/10 p-2 text-white" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-2" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.imageUrl} alt={open.caption || "Screenshot"} className="max-h-full max-w-full object-contain" />
          </div>
          {open.caption && <p className="p-4 text-center text-base font-semibold text-white" onClick={(e) => e.stopPropagation()}>{open.caption}</p>}
        </div>
      )}
    </Card>
  );
}
