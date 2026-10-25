"use client";

import { useRouter } from "next/navigation";
import { StoryRing, useHasStory } from "@/components/shared/StoryRing";
import Link from "next/link";
import Image from "next/image";
import { Twitch, Youtube, MessageSquare } from "lucide-react";
import type { UserProfile } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { formatCount } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowListDialog } from "@/components/profile/FollowListDialog";
import { ReportUserButton } from "@/components/profile/ReportUserButton";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { hasVerifiedBadge } from "@/lib/verified";
import { useStars } from "@/hooks/useStars";
import { bannerStyle, nameStyle, PROFILE_BGS, titleText } from "@/lib/starsCatalog";
import { Framed } from "@/components/stars/Framed";
import { GamerCard } from "@/components/profile/GamerCard";
import { ChallengeButton } from "@/components/challenges/ChallengeDialog";
import { FollowButton } from "@/components/profile/FollowButton";

export function ProfileHeader({ profile }: { profile: UserProfile }) {
  const { profile: viewer } = useAuth();
  const isOwnProfile = viewer?.uid === profile.uid;
  const router = useRouter();
  const hasStory = useHasStory(profile.uid);
  const { equipped, profileBg } = useStars(profile.uid);
  const bgStyle = profileBg?.type === "preset" ? PROFILE_BGS[profileBg.value]?.style : profileBg?.type === "image" ? { backgroundImage: `url("${profileBg.value}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;
  const banner = bannerStyle(equipped.banner);
  const title = titleText(equipped.title);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="relative h-40 w-full bg-brand-gradient sm:h-52" style={banner}>
        {profile.bannerURL && !banner && (
          <Image src={profile.bannerURL} alt="" fill className="object-cover" />
        )}
      </div>

      <div className="relative isolate bg-card px-6 pb-6">
        {bgStyle && (
          <>
            <div aria-hidden className="absolute inset-0 -z-10" style={bgStyle} />
            <div aria-hidden className="absolute inset-0 -z-10 bg-card/70" />
          </>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="-mt-10 flex items-end gap-4">
            <button
              type="button"
              disabled={!hasStory}
              onClick={() => router.push(`/feed?story=${profile.uid}`)}
              aria-label={hasStory ? "View story" : undefined}
              className="rounded-full"
            >
              <Framed uid={profile.uid}><StoryRing uid={profile.uid}>
                <Avatar className="h-24 w-24 border-4 border-void">
                  <AvatarImage src={profile.photoURL ?? undefined} alt={profile.displayName} />
                  <AvatarFallback className="text-2xl">{profile.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </StoryRing></Framed>
            </button>
            <div className="pb-1">
              <h1 className="font-display text-xl font-bold text-foreground"><span style={nameStyle(equipped.namecolor)}>{profile.displayName}</span>{hasVerifiedBadge(profile.badges) && <VerifiedBadge className="ml-1.5" size={18} />}</h1>
              <p className="text-sm text-steel/50">@{profile.username}</p>
              {title && <p className="mt-0.5 text-xs font-semibold text-foreground/80">{title}</p>}
            </div>
          </div>

          {isOwnProfile ? (
            <Link href="/settings">
              <Button variant="outline">Edit profile</Button>
            </Link>
          ) : viewer ? (
            <div className="flex items-center gap-2">
              <Link href={`/messages/${[viewer.uid, profile.uid].sort().join("_")}`}>
                <Button variant="outline">Message</Button>
              </Link>
              <ChallengeButton target={profile} />
              <FollowButton targetUid={profile.uid} />
              <ReportUserButton userId={profile.uid} />
            </div>
          ) : null}
        </div>

        {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-steel/80">{profile.bio}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-steel/60">
          <FollowListDialog uid={profile.uid} kind="followers">
            <button type="button" className="hover:underline"><strong className="text-foreground">{formatCount(profile.followersCount)}</strong> followers</button>
          </FollowListDialog>
          <FollowListDialog uid={profile.uid} kind="following">
            <button type="button" className="hover:underline"><strong className="text-foreground">{formatCount(profile.followingCount)}</strong> following</button>
          </FollowListDialog>
        </div>

        <GamerCard profile={profile} />

        <div className="mt-4 flex items-center gap-3">
          {profile.discordUsername && (
            <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-steel/60">
              <MessageSquare className="h-3.5 w-3.5" /> {profile.discordUsername}
            </span>
          )}
          {profile.twitchUrl && (
            <a href={profile.twitchUrl} target="_blank" rel="noreferrer" className="rounded-full border border-border p-2 text-steel/60 hover:text-foreground">
              <Twitch className="h-4 w-4" />
            </a>
          )}
          {profile.youtubeUrl && (
            <a href={profile.youtubeUrl} target="_blank" rel="noreferrer" className="rounded-full border border-border p-2 text-steel/60 hover:text-foreground">
              <Youtube className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
