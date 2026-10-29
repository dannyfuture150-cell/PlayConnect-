"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Camera } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { uploadImage, safeName, validateImageFile } from "@/lib/firebase/storage-helpers";
import { useAuth } from "@/providers/AuthProvider";
import { editProfileSchema, type EditProfileInput } from "@/lib/validations/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChipMultiSelect } from "@/components/shared/ChipMultiSelect";
import { PresetAvatarPicker } from "@/components/shared/PresetAvatarPicker";
import { GAME_ACCOUNTS, GAME_PLATFORMS } from "@/lib/gameAccounts";

const PLATFORMS = ["PC", "PlayStation", "Xbox", "Mobile", "Switch"] as const;

export function EditProfileForm() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  // Posts/comments show the author's avatar via a cached lookup — clear it
  // whenever the profile changes so old posts pick up the new picture/name.
  const refreshAuthors = () => {
    queryClient.invalidateQueries({ queryKey: ["live-author"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      displayName: profile?.displayName ?? "",
      bio: profile?.bio ?? "",
      platform: (profile?.platform as any) ?? "PC",
      favoriteGames: profile?.favoriteGames ?? [],
      efootballId: profile?.efootballId ?? "",
      eaFcId: profile?.eaFcId ?? "",
      mkId: profile?.mkId ?? "",
      efootballPlatform: profile?.efootballPlatform ?? "",
      eaFcPlatform: profile?.eaFcPlatform ?? "",
      mkPlatform: profile?.mkPlatform ?? "",
      discordUsername: profile?.discordUsername ?? "",
      twitchUrl: profile?.twitchUrl ?? "",
      youtubeUrl: profile?.youtubeUrl ?? "",
      tiktokUrl: profile?.tiktokUrl ?? "",
    },
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const err = validateImageFile(file);
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitError(null);
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(`avatars/${profile.uid}/${Date.now()}-${safeName(file.name)}`, file);
      await updateDoc(doc(db, "users", profile.uid), { photoURL: url, updatedAt: serverTimestamp() });
      refreshAuthors();
    } catch {
      setSubmitError("Couldn't upload that image. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handlePresetSelect(url: string) {
    if (!profile) return;
    setSubmitError(null);
    try {
      await updateDoc(doc(db, "users", profile.uid), { photoURL: url, updatedAt: serverTimestamp() });
      refreshAuthors();
    } catch {
      setSubmitError("Couldn't set that avatar. Please try again.");
    }
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const err = validateImageFile(file);
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitError(null);
    setUploadingBanner(true);
    try {
      const url = await uploadImage(`banners/${profile.uid}/${Date.now()}-${safeName(file.name)}`, file);
      await updateDoc(doc(db, "users", profile.uid), { bannerURL: url, updatedAt: serverTimestamp() });
      refreshAuthors();
    } catch {
      setSubmitError("Couldn't upload that image. Please try again.");
    } finally {
      setUploadingBanner(false);
    }
  }

  async function onSubmit(data: EditProfileInput) {
    if (!profile) return;
    setSubmitError(null);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      refreshAuthors();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSubmitError("Couldn't save changes. Please try again.");
    }
  }

  if (!profile) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label>Banner</Label>
        <button
          type="button"
          onClick={() => bannerInputRef.current?.click()}
          className="relative h-24 w-full overflow-hidden rounded-xl bg-brand-gradient"
        >
          {profile.bannerURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.bannerURL} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30 text-white opacity-0 transition-opacity hover:opacity-100">
            <Camera className="h-5 w-5" />
          </div>
          {uploadingBanner && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-xs text-white">Uploading…</div>
          )}
        </button>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
      </div>

      <div className="flex items-center gap-4">
        <button type="button" onClick={() => avatarInputRef.current?.click()} className="relative">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.photoURL ?? undefined} alt={profile.displayName} />
            <AvatarFallback className="text-lg">{profile.displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-white">
            <Camera className="h-3 w-3" />
          </span>
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/50 text-[10px] text-white">…</div>
          )}
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <p className="text-xs text-steel/50">Tap your avatar or banner to change it.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>No photo? Pick an avatar (optional)</Label>
        <PresetAvatarPicker selectedUrl={profile.photoURL} onSelect={handlePresetSelect} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" {...register("displayName")} />
        {errors.displayName && <p className="text-xs text-signal-red">{errors.displayName.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" {...register("bio")} />
        {errors.bio && <p className="text-xs text-signal-red">{errors.bio.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="platform">Platform</Label>
        <select id="platform" {...register("platform")} className="h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground">
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Favorite games</Label>
        <Controller
          name="favoriteGames"
          control={control}
          render={({ field }) => <ChipMultiSelect value={field.value} onChange={field.onChange} />}
        />
        {errors.favoriteGames && <p className="text-xs text-signal-red">{errors.favoriteGames.message}</p>}
      </div>

      <div className="rounded-2xl border border-border p-4">
        <p className="font-display text-base font-bold">Connect your games</p>
        <p className="mt-0.5 text-xs text-steel/60">
          Add your in-game name for each game you play. Organisers and opponents see it, so they can add you and play your match.
        </p>
        <div className="mt-3 flex flex-col gap-4">
          {GAME_ACCOUNTS.map((g) => (
            <div key={g.key} className="flex flex-col gap-1.5">
              <Label htmlFor={g.idField}>{g.label}</Label>
              <div className="flex gap-2">
                <select
                  aria-label={`${g.label} platform`}
                  {...register(g.platformField)}
                  className="h-11 w-32 shrink-0 rounded-xl border border-border bg-muted px-2 text-sm text-foreground"
                >
                  <option value="">Platform</option>
                  {GAME_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <Input id={g.idField} placeholder={g.idLabel} autoComplete="off" {...register(g.idField)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="discordUsername">Discord username</Label>
          <Input id="discordUsername" {...register("discordUsername")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="twitchUrl">Twitch URL</Label>
          <Input id="twitchUrl" {...register("twitchUrl")} />
          {errors.twitchUrl && <p className="text-xs text-signal-red">{errors.twitchUrl.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="youtubeUrl">YouTube URL</Label>
          <Input id="youtubeUrl" {...register("youtubeUrl")} />
          {errors.youtubeUrl && <p className="text-xs text-signal-red">{errors.youtubeUrl.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tiktokUrl">TikTok URL</Label>
          <Input id="tiktokUrl" {...register("tiktokUrl")} />
          {errors.tiktokUrl && <p className="text-xs text-signal-red">{errors.tiktokUrl.message}</p>}
        </div>
      </div>

      {submitError && <p className="text-sm text-signal-red">{submitError}</p>}
      {saved && <p className="text-sm text-signal-green">Profile saved.</p>}

      <Button type="submit" size="lg" className="self-start" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
