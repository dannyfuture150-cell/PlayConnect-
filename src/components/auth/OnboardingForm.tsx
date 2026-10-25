"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { onboardingSchema, type OnboardingInput } from "@/lib/validations/auth";
import { slugifyUsername } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown, Gamepad2, Trophy } from "lucide-react";
import { ChipMultiSelect } from "@/components/shared/ChipMultiSelect";
import { PresetAvatarPicker } from "@/components/shared/PresetAvatarPicker";
import { cn } from "@/lib/utils";
import { readNext } from "@/lib/nextUrl";
import type { AccountType } from "@/types";

const PLATFORMS = ["PC", "PlayStation", "Xbox", "Mobile", "Switch"] as const;

export function OnboardingForm() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(profile?.photoURL ?? null);
  const [accountType, setAccountType] = useState<AccountType>(profile?.accountType ?? "player");
  const [showMore, setShowMore] = useState(false);
  const [heardFrom, setHeardFrom] = useState<string>("");
  const [friendName, setFriendName] = useState("");
  useEffect(() => {
    try {
      const ref = localStorage.getItem("playconnect-ref");
      if (ref) {
        setHeardFrom("A friend or another player");
        setFriendName(ref);
      }
    } catch {}
  }, []);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      username: profile?.username || slugifyUsername(profile?.displayName || ""),
      displayName: profile?.displayName || "",
      platform: "Mobile",
      favoriteGames: [],
      bio: "",
    },
  });

  const favoriteGames = watch("favoriteGames");

  async function onSubmit(data: OnboardingInput) {
    if (!user) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      setCheckingUsername(true);
      const usernameRef = doc(db, "usernames", data.username);
      const usernameSnap = await getDoc(usernameRef);
      setCheckingUsername(false);

      if (usernameSnap.exists() && usernameSnap.data().uid !== user.uid) {
        setSubmitError("That username is already taken.");
        setIsSubmitting(false);
        return;
      }

      // "How did you know PlayConnect?": if a friend told them, find that friend so they earn PlayCoins.
      let referredBy: string | null = null;
      let referredByUsername: string | null = null;
      const friend = friendName.trim().toLowerCase().replace(/^@/, "");
      if (heardFrom === "A friend or another player" && friend) {
        const friendSnap = await getDoc(doc(db, "usernames", friend));
        if (!friendSnap.exists()) {
          setSubmitError(`We couldn't find @${friend}. Check the spelling, or clear that box.`);
          setIsSubmitting(false);
          return;
        }
        if (friendSnap.data().uid !== user.uid && !profile?.referredBy) {
          referredBy = friendSnap.data().uid as string;
          referredByUsername = friend;
        }
      }

      // Reserve the username in its own collection so lookups & uniqueness
      // checks don't require scanning the users collection.
      if (!usernameSnap.exists()) await setDoc(usernameRef, { uid: user.uid });

      await setDoc(
        doc(db, "users", user.uid),
        {
          username: data.username,
          displayName: data.displayName?.trim() || data.username,
          accountType,
          accountTypeLocked: true,
          platform: data.platform,
          favoriteGames: data.favoriteGames,
          bio: data.bio ?? "",
          ...(selectedAvatar ? { photoURL: selectedAvatar } : {}),
          onboardingComplete: true,
          ...(heardFrom ? { heardFrom } : {}),
          ...(referredBy ? { referredBy, referredByUsername } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      try { localStorage.removeItem("playconnect-ref"); } catch {}
      router.push(readNext() ?? "/feed");
    } catch (err) {
      setSubmitError("Something went wrong saving your profile. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label>Are you a player or an organiser?</Label>
        <p className="text-xs text-steel/50">
          Most people are players. Only organisers can create tournaments, and this can&apos;t be changed later.
        </p>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType("player")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-colors",
              accountType === "player" ? "border-violet bg-violet/10" : "border-border bg-card hover:bg-muted"
            )}
          >
            <Gamepad2 className={cn("h-6 w-6", accountType === "player" ? "text-violet-glow" : "text-steel/40")} />
            <span className="text-sm font-semibold text-foreground">Player</span>
            <span className="text-[11px] text-steel/50">Join tournaments &amp; leagues, build your rank</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountType("organizer")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-colors",
              accountType === "organizer" ? "border-violet bg-violet/10" : "border-border bg-card hover:bg-muted"
            )}
          >
            <Trophy className={cn("h-6 w-6", accountType === "organizer" ? "text-violet-glow" : "text-steel/40")} />
            <span className="text-sm font-semibold text-foreground">Organiser</span>
            <span className="text-[11px] text-steel/50">Create &amp; run tournaments and leagues</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          placeholder="e.g. shadow_striker"
          {...register("username")}
          onChange={(e) => setValue("username", slugifyUsername(e.target.value))}
        />
        {errors.username && <p className="text-xs text-signal-red">{errors.username.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Pick the games you play (at least one)</Label>
        <Controller
          name="favoriteGames"
          control={control}
          render={({ field }) => (
            <ChipMultiSelect value={field.value} onChange={field.onChange} />
          )}
        />
        <p className="text-xs text-steel/40">{favoriteGames?.length ?? 0}/8 selected</p>
        {errors.favoriteGames && <p className="text-xs text-signal-red">{errors.favoriteGames.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="heard">How did you know PlayConnect? (optional)</Label>
        <select
          id="heard"
          value={heardFrom}
          onChange={(e) => setHeardFrom(e.target.value)}
          className="h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50"
        >
          <option value="">Choose one (optional)</option>
          {["A friend or another player", "WhatsApp", "Facebook", "Instagram", "TikTok", "A tournament", "Other"].map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {heardFrom === "A friend or another player" && (
          <>
            <Input placeholder="Their PlayConnect username (so they earn PlayCoins)" value={friendName} onChange={(e) => setFriendName(e.target.value)} />
            <p className="text-xs text-steel/50">You both get PlayCoins when you join your first tournament.</p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="flex items-center gap-1.5 self-start text-sm font-medium text-violet-glow hover:underline"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} />
        {showMore ? "Hide extras" : "Add more (display name, avatar, platform, bio)"}
      </button>

      <div className={cn("flex flex-col gap-5", !showMore && "hidden")}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Display name (optional)</Label>
        <Input id="displayName" placeholder="How you want to show up" {...register("displayName")} />
        {errors.displayName && <p className="text-xs text-signal-red">{errors.displayName.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>No photo? Pick an avatar (optional)</Label>
        <PresetAvatarPicker selectedUrl={selectedAvatar} onSelect={setSelectedAvatar} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="platform">Platform</Label>
        <select
          id="platform"
          {...register("platform")}
          className="h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio (optional)</Label>
        <Textarea id="bio" placeholder="Tell the squad who you are" {...register("bio")} />
        {errors.bio && <p className="text-xs text-signal-red">{errors.bio.message}</p>}
      </div>

      </div>

      {submitError && <p className="text-sm text-signal-red">{submitError}</p>}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {checkingUsername ? "Checking username…" : isSubmitting ? "Saving…" : "Enter PlayConnect"}
      </Button>
    </form>
  );
}
