"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Search, Trash2 } from "lucide-react";
import { useAdminPosts } from "@/hooks/useAdmin";
import { useDeletePost } from "@/hooks/usePosts";
import { useQueryClient } from "@tanstack/react-query";
import type { Post } from "@/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatCount } from "@/lib/utils";

type Filter = "all" | "media" | "text";

export default function AdminPostsPage() {
  const { data: posts, isLoading } = useAdminPosts();
  const deletePost = useDeletePost();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = (posts ?? []).filter((p) => {
    const q = search.trim().toLowerCase();
    const matches =
      !q ||
      p.text?.toLowerCase().includes(q) ||
      p.author?.username?.toLowerCase().includes(q) ||
      p.author?.displayName?.toLowerCase().includes(q);
    const hasMedia = (p.mediaUrls?.length ?? 0) > 0;
    const matchesFilter = filter === "all" || (filter === "media" ? hasMedia : !hasMedia);
    return matches && matchesFilter;
  });

  async function handleDelete(p: Post) {
    setError(null);
    try {
      await deletePost.mutateAsync({ postId: p.id, authorId: p.authorId });
      setConfirmingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch {
      setError("Couldn't delete that post — make sure the latest Firestore rules are published.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Posts</h1>
        <p className="text-sm text-steel/50">Latest {posts?.length ?? 0} posts across the platform.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel/40" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search text or author…" className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "media", "text"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
                filter === f ? "border-violet/50 bg-violet/10 text-violet-glow" : "border-border bg-card text-steel/60"
              }`}
            >
              {f === "text" ? "Text only" : f}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}
      {isLoading && <div className="h-24 animate-pulse rounded-2xl bg-muted" />}
      {!isLoading && filtered.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-sm text-steel/50">No posts match.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((p) => {
          const thumb = p.mediaUrls?.[0];
          return (
            <Card key={p.id} className="flex gap-3 p-3.5">
              {thumb && p.mediaType !== "video" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              )}
              {thumb && p.mediaType === "video" && (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] text-steel/50">
                  Video
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={p.author?.photoURL ?? undefined} alt="" />
                    <AvatarFallback className="text-[9px]">{p.author?.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <Link href={`/profile/${p.author?.username}`} target="_blank" className="truncate text-xs font-semibold text-foreground hover:underline">
                    {p.author?.displayName}
                  </Link>
                  <span className="shrink-0 text-[11px] text-steel/40">
                    {p.createdAt ? formatDistanceToNow(p.createdAt.toDate(), { addSuffix: true }) : ""}
                  </span>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-steel/80">{p.text || <em className="text-steel/40">No text</em>}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-steel/40">
                    {formatCount(p.likesCount ?? 0)} likes · {formatCount(p.commentsCount ?? 0)} comments
                    {(p.mediaUrls?.length ?? 0) > 1 ? ` · ${p.mediaUrls.length} images` : ""}
                  </p>
                  {confirmingId === p.id ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="destructive" disabled={deletePost.isPending} onClick={() => handleDelete(p)}>
                        {deletePost.isPending ? "Deleting…" : "Confirm"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(p.id)}
                      className="rounded-lg p-1.5 text-steel/40 hover:bg-signal-red/10 hover:text-signal-red"
                      title="Delete post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
