"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PostCard } from "@/components/feed/PostCard";
import type { Post } from "@/types";

function usePost(postId: string) {
  return useQuery<Post | null>({
    queryKey: ["post", postId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "posts", postId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Post;
    },
    enabled: !!postId,
  });
}

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const { data: post, isLoading } = usePost(params.id);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  }

  if (!post) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-steel/50">This post doesn&apos;t exist, or was deleted.</p>
      </div>
    );
  }

  return <PostCard post={post} />;
}
