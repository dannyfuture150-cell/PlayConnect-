"use client";

import { Bookmark } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useSavedPosts } from "@/hooks/usePosts";
import { PostCard } from "@/components/feed/PostCard";

export default function SavedPostsPage() {
  const { profile } = useAuth();
  const { data: posts, isLoading } = useSavedPosts(profile?.savedPostIds);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Saved</h1>
        <p className="text-sm text-steel/50">Posts you&apos;ve bookmarked.</p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && (!posts || posts.length === 0) && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-steel/30" />
          <p className="mt-3 text-sm text-steel/50">
            Nothing saved yet — tap the bookmark icon on any post to save it here.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
