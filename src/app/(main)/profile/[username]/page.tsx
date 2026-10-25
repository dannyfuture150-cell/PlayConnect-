"use client";

import { useProfileByUsername, useUserPosts } from "@/hooks/useProfile";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileBadges } from "@/components/profile/ProfileBadges";
import { PlayerCard } from "@/components/profile/PlayerCard";
import { ProfilePostGrid } from "@/components/profile/ProfilePostGrid";

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { data: profile, isLoading, isError } = useProfileByUsername(params.username);
  const { data: posts } = useUserPosts(profile?.uid);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-52 animate-pulse rounded-2xl bg-card" />
        <div className="h-40 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-steel/50">No player found at @{params.username}.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ProfileHeader profile={profile} />
      <PlayerCard profile={profile} />
      <ProfileBadges profile={profile} />

      <div className="flex flex-col gap-4">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-steel/50">
          Posts
        </h2>
        {posts && posts.length > 0 ? (
          <ProfilePostGrid posts={posts} />
        ) : (
          <p className="text-sm text-steel/40">No posts yet.</p>
        )}
      </div>
    </div>
  );
}
