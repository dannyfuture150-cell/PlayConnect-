"use client";

import { useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useLiveAuthor } from "@/hooks/useProfile";
import { safeName, uploadImage, validateImageFile } from "@/lib/firebase/storage-helpers";
import { gameArt } from "@/lib/gameArt";

/** An organiser's tournament profile: the picture players see next to their name on the Tournaments tab. */
export function HubPictureEditor({ game }: { game: string }) {
  const { profile } = useAuth();
  const { data: me } = useLiveAuthor(profile?.uid);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!profile) return null;
  const uid = profile.uid;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const bad = validateImageFile(file);
    if (bad) {
      setError(bad);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const url = await uploadImage(`avatars/${uid}/hub/${Date.now()}-${safeName(file.name)}`, file);
      await updateDoc(doc(db, "users", uid), { hubPhotoURL: url });
      await queryClient.invalidateQueries({ queryKey: ["live-author", uid] });
    } catch (err) {
      setError((err as Error).message || "Couldn't save the picture. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4">
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-brand-gradient" aria-label="Change tournament picture">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={me?.hubPhotoURL || gameArt(game, uid)} alt="" className="h-full w-full object-cover" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold text-foreground">{profile.displayName}</p>
        <p className="mt-0.5 truncate text-base text-steel/60">{game}</p>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="mt-1 text-xs font-semibold text-violet-glow">
          {busy ? "Saving…" : me?.hubPhotoURL ? "Change tournament picture" : "Add tournament picture"}
        </button>
        {error && <p className="mt-1 text-xs text-signal-red">{error}</p>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );
}
