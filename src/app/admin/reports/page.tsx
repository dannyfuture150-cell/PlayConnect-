"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminPosts, useAdminReports, useAdminUsers, useSetReportStatus } from "@/hooks/useAdmin";
import { useDeletePost } from "@/hooks/usePosts";
import type { Report } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Filter = Report["status"] | "all";

export default function AdminReportsPage() {
  const { data: reports, isLoading } = useAdminReports();
  const { data: posts } = useAdminPosts();
  const { data: users } = useAdminUsers();
  const setStatus = useSetReportStatus();
  const deletePost = useDeletePost();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("open");
  const [error, setError] = useState<string | null>(null);

  const filtered = (reports ?? []).filter((r) => filter === "all" || r.status === filter);
  const nameOf = (uid: string) => users?.find((u) => u.uid === uid)?.displayName ?? "Unknown";

  async function setReportStatus(id: string, status: Report["status"]) {
    setError(null);
    try {
      await setStatus.mutateAsync({ id, status });
    } catch {
      setError("Permission denied — make sure the latest Firestore rules are published.");
    }
  }

  async function removePost(r: Report, post: { id: string; authorId: string }) {
    setError(null);
    try {
      await deletePost.mutateAsync({ postId: post.id, authorId: post.authorId });
      await setStatus.mutateAsync({ id: r.id, status: "reviewed" });
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch {
      setError("Couldn't remove that post.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-steel/50">Posts and people reported by members.</p>
      </div>

      <div className="flex gap-1.5">
        {(["open", "reviewed", "dismissed", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
              filter === f ? "border-violet/50 bg-violet/10 text-violet-glow" : "border-border bg-card text-steel/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}
      {isLoading && <div className="h-24 animate-pulse rounded-2xl bg-muted" />}
      {!isLoading && filtered.length === 0 && (
        <Card className="p-10 text-center text-sm text-steel/50">Nothing here — no {filter === "all" ? "" : filter} reports.</Card>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((r) => {
          const post = r.targetType === "post" ? posts?.find((p) => p.id === r.targetId) : undefined;
          return (
            <Card key={r.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">{r.reason}</p>
                <span className="text-[11px] text-steel/40">
                  {r.createdAt ? formatDistanceToNow(r.createdAt.toDate(), { addSuffix: true }) : ""}
                </span>
              </div>
              <p className="text-xs text-steel/50">Reported by {nameOf(r.reporterId)} · {r.targetType}</p>

              {r.targetType === "post" &&
                (post ? (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-semibold text-foreground">{post.author?.displayName}</p>
                    <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-steel/80">{post.text || "(media only)"}</p>
                  </div>
                ) : (
                  <p className="text-xs italic text-steel/40">This post no longer exists (or is older than the latest 200).</p>
                ))}

              {r.targetType === "story" && (() => {
                const u = users?.find((x) => x.uid === r.targetUid);
                return (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-semibold text-foreground">Reported story by {u ? `${u.displayName} (@${u.username})` : "unknown"}</p>
                    {u && <a href={`/profile/${u.username}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-violet-glow underline">View profile</a>}
                    <p className="mt-1 text-[11px] text-steel/50">Stories disappear after 24 hours. Use Admin → Users to suspend the account if needed.</p>
                  </div>
                );
              })()}

              {r.targetType === "user" && (() => {
                const u = users?.find((x) => x.uid === r.targetId);
                return u ? (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-semibold text-foreground">Reported user: {u.displayName} (@{u.username})</p>
                    <a href={`/profile/${u.username}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-violet-glow underline">View profile</a>
                    <span className="ml-2 text-[11px] text-steel/50">Use Admin → Users to suspend or delete.</span>
                  </div>
                ) : (
                  <p className="text-xs italic text-steel/40">This account no longer exists.</p>
                );
              })()}

              {r.targetType === "organizer" && (() => {
                const u = users?.find((x) => x.uid === r.targetId);
                return (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs font-semibold text-foreground">
                      Prize not received{r.tournamentTitle ? ` · ${r.tournamentTitle}` : ""}{r.prize ? ` · ${r.prize}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-steel/70">Organiser: {u ? `${u.displayName} (@${u.username})` : "Unknown"}</p>
                    {u && <a href={`/profile/${u.username}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-violet-glow underline">View organiser</a>}
                    {r.tournamentId && <a href={`/tournaments/${r.tournamentId}`} target="_blank" rel="noreferrer" className="ml-2 mt-1 inline-block text-xs text-violet-glow underline">View tournament</a>}
                  </div>
                );
              })()}

              <div className="flex flex-wrap gap-2 pt-1">
                {r.status === "open" && (
                  <>
                    {post && (
                      <Button size="sm" variant="destructive" disabled={deletePost.isPending} onClick={() => removePost(r, post)}>
                        Remove post
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setReportStatus(r.id, "dismissed")}>
                      Dismiss
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReportStatus(r.id, "reviewed")}>
                      Mark reviewed
                    </Button>
                  </>
                )}
                {r.status !== "open" && (
                  <Button size="sm" variant="outline" onClick={() => setReportStatus(r.id, "open")}>
                    Reopen
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
