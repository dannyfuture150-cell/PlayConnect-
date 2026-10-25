"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Megaphone, X } from "lucide-react";
import { useCreateAnnouncement } from "@/hooks/useCommunityAnnouncements";
import { useAuth } from "@/providers/AuthProvider";
import { validateImageFile } from "@/lib/firebase/storage-helpers";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AnnouncementComposer({ communityId }: { communityId: string }) {
  const { profile } = useAuth();
  const createAnnouncement = useCreateAnnouncement(communityId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImage(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  async function handlePost() {
    if (!profile || !text.trim()) return;
    setError(null);
    try {
      await createAnnouncement.mutateAsync({
        text: text.trim(),
        image: image ?? undefined,
        author: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
      });
      setText("");
      clearImage();
    } catch (err) {
      setError((err as Error).message || "Couldn't post that announcement.");
    }
  }

  if (!profile) return null;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-steel/50">
        <Megaphone className="h-3.5 w-3.5 text-violet-glow" /> Post an announcement
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share news, event details, or updates with the community…"
        className="min-h-[70px]"
      />

      {preview && (
        <div className="relative mt-2 aspect-video overflow-hidden rounded-xl bg-muted">
          <Image src={preview} alt="" fill className="object-cover" unoptimized />
          <button
            type="button"
            onClick={clearImage}
            className="absolute right-1.5 top-1.5 rounded-full bg-slate-950/60 p-1 text-white hover:bg-slate-950/80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-signal-red">{error}</p>}

      <div className="mt-2 flex items-center justify-between">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-steel/50 hover:bg-muted hover:text-steel"
        >
          <ImagePlus className="h-4 w-4" />
          Image
        </button>
        <Button size="sm" disabled={!text.trim() || createAnnouncement.isPending} onClick={handlePost}>
          {createAnnouncement.isPending ? "Posting…" : "Post announcement"}
        </Button>
      </div>
    </Card>
  );
}
