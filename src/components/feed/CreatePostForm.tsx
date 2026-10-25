"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Plus, Send, Video, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { createPostSchema, type CreatePostInput } from "@/lib/validations/profile";
import { validateImageFile, validateVideoFile } from "@/lib/firebase/storage-helpers";
import { useCreatePost } from "@/hooks/usePosts";
import { useAuth } from "@/providers/AuthProvider";
import { MentionInput } from "@/components/shared/MentionInput";
import { notifyMentions } from "@/lib/mentions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const DRAFT_KEY = "playconnect-draft-text";

const MAX_IMAGES = 10;
const MAX_VIDEO_SECONDS = 180;

export function CreatePostForm() {
  const { profile } = useAuth();
  const pathname = usePathname();
  const createPost = useCreatePost();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [checkingVideo, setCheckingVideo] = useState(false);
  const [progress, setProgress] = useState(0);
  const [game, setGame] = useState<string>("");
  const [remoteImage, setRemoteImage] = useState<string | null>(null); // screenshot attached from "Post your win"

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreatePostInput>({ resolver: zodResolver(createPostSchema), defaultValues: { text: "" } });

  const text = watch("text");

  // Restore the unfinished draft, the last game used, and a "post your win" prefill.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const prefill = params.get("draft");
      const img = params.get("img");
      const r2Base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(/\/+$/, "");
      if (img && (/^https:\/\/res\.cloudinary\.com\//.test(img) || (r2Base && img.startsWith(r2Base + "/")))) setRemoteImage(img);
      if (img || prefill) setOpen(true);
      setGame(params.get("game") || "");
      const draft = prefill || localStorage.getItem(DRAFT_KEY) || "";
      if (draft) setValue("text", draft);
      if (prefill) window.history.replaceState(null, "", window.location.pathname);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid, pathname]);

  // Save the draft as you type.
  useEffect(() => {
    try {
      if (text) localStorage.setItem(DRAFT_KEY, text);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [text]);

  function clearImages() {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setImages([]);
    setPreviews([]);
  }

  function clearVideo() {
    setVideo(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    addImages(files);
  }

  function addImages(files: File[]) {
    setMediaError(null);

    if (images.length + files.length > MAX_IMAGES) {
      setMediaError(`Up to ${MAX_IMAGES} images per post.`);
      return;
    }
    for (const file of files) {
      const err = validateImageFile(file);
      if (err) {
        setMediaError(err);
        return;
      }
    }
    setRemoteImage(null);
    // Only clear the video once the images have actually passed validation —
    // otherwise a rejected selection would wipe out a video you'd already
    // attached for nothing.
    if (video) clearVideo(); // images and video are mutually exclusive per post
    setImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  }

  async function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await addVideo(file);
  }

  /** One gallery picker for photos and videos: photos (several) or a single video. */
  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const vids = files.filter((f) => f.type.startsWith("video/"));
    const imgs = files.filter((f) => !f.type.startsWith("video/"));
    setOpen(true);
    if (vids.length && imgs.length) {
      setMediaError("Pick photos or one video, not both in the same post.");
      return;
    }
    if (vids.length) {
      if (vids.length > 1) setMediaError("Only one video per post — using the first.");
      await addVideo(vids[0]);
    } else {
      addImages(imgs);
    }
  }

  async function addVideo(file: File) {
    setMediaError(null);

    setCheckingVideo(true);
    const err = await validateVideoFile(file, MAX_VIDEO_SECONDS);
    setCheckingVideo(false);
    if (err) {
      setMediaError(err);
      return;
    }
    // Only clear images once the video has actually passed validation —
    // same reasoning as above, the other direction.
    clearImages(); // images and video are mutually exclusive per post
    setRemoteImage(null);
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function onSubmit(data: CreatePostInput) {
    if (!profile) return;
    setMediaError(null);
    setProgress(0);
    try {
      const newPostId = await createPost.mutateAsync({
        text: data.text,
        gameTag: game || undefined,
        onProgress: setProgress,
        existingImageUrl: remoteImage ?? undefined,
        images: images.length ? images : undefined,
        video: video ?? undefined,
        author: {
          uid: profile.uid,
          username: profile.username,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
        },
      });
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      if (data.text.includes("@") && newPostId) {
        notifyMentions({
          text: data.text,
          from: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
          postId: newPostId,
        });
      }
      reset();
      clearImages();
      clearVideo();
      setRemoteImage(null);
      setProgress(0);
      setOpen(false);
    } catch (e: any) {
      // Show the real reason instead of always blaming the connection.
      const code: string = e?.code ?? "";
      let msg: string = e instanceof Error ? e.message : "";
      if (code === "permission-denied") msg = "Not allowed — the Firestore rules may need republishing.";
      else if (code === "unavailable") msg = "Network error — check your connection and try again.";
      setMediaError(`Couldn't post — ${msg || "something went wrong"}`);
    }
  }

  if (!profile) return null;

  const hasMedia = images.length > 0 || !!video || !!remoteImage;

  function onOpenChange(next: boolean) {
    if (!next && createPost.isPending) return; // don't lose an upload in progress
    setOpen(next);
    if (!next) {
      clearImages();
      clearVideo();
      setRemoteImage(null);
      setMediaError(null);
    }
  }

  return (
    <>
      <input ref={pickRef} type="file" accept="image/*,video/*" multiple onChange={handlePick} className="hidden" />
      <button
        type="button"
        onClick={() => pickRef.current?.click()}
        aria-label="New post"
        className="flex h-10 w-10 items-center justify-center text-foreground active:scale-95"
      >
        <Plus className="h-8 w-8" strokeWidth={1.75} />
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto p-4">
          <DialogTitle className="mb-3">New post</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
        <Avatar className="mt-0.5 h-10 w-10">
          <AvatarImage src={profile.photoURL ?? undefined} alt={profile.displayName} />
          <AvatarFallback>{profile.displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <Controller
            name="text"
            control={control}
            render={({ field }) => (
              <MentionInput
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Write a caption… use @ to tag a player"
                minHeight={60}
                maxHeight={220}
                className="bg-transparent px-0 py-1.5"
              />
            )}
          />
          {errors.text && <p className="text-xs text-signal-red">{errors.text.message}</p>}

          {previews.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                  <Image src={src} alt="" fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-slate-950/60 p-1 text-white hover:bg-slate-950/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {remoteImage && (
            <div className="relative mt-2 overflow-hidden rounded-xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={remoteImage} alt="Match screenshot" className="max-h-64 w-full object-contain" />
              <button
                type="button"
                onClick={() => setRemoteImage(null)}
                className="absolute right-1.5 top-1.5 rounded-full bg-slate-950/60 p-1 text-white hover:bg-slate-950/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {videoPreview && (
            <div className="relative mt-2 aspect-video overflow-hidden rounded-xl bg-muted">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoPreview} controls className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={clearVideo}
                className="absolute right-1.5 top-1.5 rounded-full bg-slate-950/60 p-1 text-white hover:bg-slate-950/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {checkingVideo && <p className="mt-1 text-xs text-steel/50">Checking video…</p>}
          {createPost.isPending && hasMedia && (
            <div className="mt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand-gradient transition-all" style={{ width: `${Math.max(5, progress)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-steel/60">Uploading… {progress}%</p>
            </div>
          )}
          {mediaError && (
            <p className="mt-1 text-xs text-signal-red">
              {mediaError}
              {hasMedia && !createPost.isPending && <> Your photo/video is still attached — tap <strong>Post</strong> to try again.</>}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={!!video}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-steel/50 hover:bg-muted hover:text-steel disabled:opacity-40"
              >
                <ImagePlus className="h-4 w-4" />
                Photo
              </button>

              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={images.length > 0 || checkingVideo}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-steel/50 hover:bg-muted hover:text-steel disabled:opacity-40"
                title={`Clips up to ${Math.round(MAX_VIDEO_SECONDS / 60)} min`}
              >
                <Video className="h-4 w-4" />
                Video
              </button>
            </div>

            <Button type="submit" size="sm" disabled={(!text?.trim() && !hasMedia) || createPost.isPending || checkingVideo}>
              <Send className="h-3.5 w-3.5" />
              {createPost.isPending ? "Posting…" : mediaError && hasMedia ? "Try again" : "Post"}
            </Button>
          </div>
        </div>
      </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
