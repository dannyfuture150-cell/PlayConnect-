"use client";

import { Framed } from "@/components/stars/Framed";
import { PlayerName } from "@/components/stars/PlayerName";
import { StoryRing } from "@/components/shared/StoryRing";
import { VerifiedTick } from "@/components/shared/VerifiedBadge";
import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CornerDownRight, Trash2, X } from "lucide-react";
import { useComments } from "@/hooks/useComments";
import { useAddComment, useDeleteComment } from "@/hooks/usePosts";
import { useLiveAuthor } from "@/hooks/useProfile";
import { useAuth } from "@/providers/AuthProvider";
import type { Comment } from "@/types";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ReplyTarget {
  parentId: string;
  parentAuthorId: string;
  replyTo: { uid: string; displayName: string };
}

function CommentItem({
  comment,
  postId,
  canDelete,
  replyIds,
  onReply,
  small,
}: {
  comment: Comment;
  postId: string;
  canDelete: boolean;
  replyIds?: string[];
  onReply?: (author: { uid: string; displayName: string }) => void;
  small?: boolean;
}) {
  const deleteComment = useDeleteComment(postId);
  const [confirming, setConfirming] = useState(false);

  // Same fix as posts — look up the commenter's current profile instead of
  // the name/photo frozen at the moment they commented.
  const { data: liveAuthor } = useLiveAuthor(comment.authorId);
  const author = liveAuthor ?? comment.author;

  return (
    <div className="group flex gap-2.5">
      <Link href={`/profile/${author.username}`} className="shrink-0"><Framed uid={comment.authorId} thin><StoryRing uid={comment.authorId}><Avatar className={small ? "h-6 w-6 shrink-0" : "h-7 w-7 shrink-0"}>
        <AvatarImage src={author.photoURL ?? undefined} alt={author.displayName} />
        <AvatarFallback className="text-[11px]">{author.displayName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar></StoryRing></Framed></Link>
      <div className="flex-1 rounded-xl bg-muted px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <Link href={`/profile/${author.username}`} className="text-xs font-semibold text-foreground"><PlayerName uid={comment.authorId} name={author.displayName} /></Link><VerifiedTick uid={comment.authorId} size={12} />
            <span className="text-[11px] text-steel/40">
              {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : "now"}
            </span>
          </div>
          {canDelete && (
            confirming ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => deleteComment.mutate({ commentId: comment.id, replyIds })}
                  disabled={deleteComment.isPending}
                  className="text-[10px] font-semibold text-signal-red hover:underline"
                >
                  Delete
                </button>
                <button onClick={() => setConfirming(false)} className="text-[10px] text-steel/50 hover:underline">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="shrink-0 text-steel/30 opacity-0 hover:text-signal-red group-hover:opacity-100"
                title="Delete comment"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )
          )}
        </div>
        <p className="text-sm text-steel/80">
          {comment.replyTo && <span className="mr-1 font-medium text-violet-glow">@{comment.replyTo.displayName}</span>}
          {comment.text}
        </p>
        {onReply && (
          <button
            onClick={() => onReply({ uid: comment.authorId, displayName: author.displayName })}
            className="mt-1 text-[11px] font-medium text-steel/50 hover:text-foreground"
          >
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

export function CommentSection({ postId, postAuthorId }: { postId: string; postAuthorId: string }) {
  const { profile } = useAuth();
  const { comments, loading } = useComments(postId, true);
  const addComment = useAddComment(postId, postAuthorId);
  const [text, setText] = useState("");
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parentId) repliesByParent.set(c.parentId, [...(repliesByParent.get(c.parentId) ?? []), c]);
  }

  function startReply(parent: Comment, who: { uid: string; displayName: string }) {
    // Replies are one level deep: replying to a reply still attaches to the top-level comment.
    const parentId = parent.parentId ?? parent.id;
    const parentAuthorId = parent.parentId ? parent.parentAuthorId ?? parent.authorId : parent.authorId;
    setReplyTarget({ parentId, parentAuthorId, replyTo: who });
    setExpanded((prev) => new Set(prev).add(parentId));
    inputRef.current?.focus();
  }

  async function submit() {
    if (!profile || !text.trim() || addComment.isPending) return;
    try {
    await addComment.mutateAsync({
      text: text.trim(),
      author: {
        uid: profile.uid,
        username: profile.username,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
      },
      ...(replyTarget ?? {}),
    });
    setText("");
    setReplyTarget(null);
    } catch {
      // keep the text so the user can retry
    }
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3">
      {loading && <p className="text-xs text-steel/40">Loading comments…</p>}

      {topLevel.map((c) => {
        const replies = repliesByParent.get(c.id) ?? [];
        const open = expanded.has(c.id);
        return (
          <div key={c.id} className="flex flex-col gap-2">
            <CommentItem
              comment={c}
              postId={postId}
              canDelete={!!profile && (profile.uid === c.authorId || profile.uid === postAuthorId)}
              replyIds={replies.map((r) => r.id)}
              onReply={profile ? (who) => startReply(c, who) : undefined}
            />
            {replies.length > 0 && (
              <div className="ml-9 flex flex-col gap-2">
                <button
                  onClick={() => toggle(c.id)}
                  className="flex items-center gap-1.5 self-start text-[11px] font-medium text-steel/50 hover:text-foreground"
                >
                  <CornerDownRight className="h-3 w-3" />
                  {open ? "Hide replies" : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                </button>
                {open &&
                  replies.map((r) => (
                    <CommentItem
                      key={r.id}
                      comment={r}
                      postId={postId}
                      small
                      canDelete={
                        !!profile &&
                        (profile.uid === r.authorId || profile.uid === postAuthorId || profile.uid === c.authorId)
                      }
                      onReply={profile ? (who) => startReply(r, who) : undefined}
                    />
                  ))}
              </div>
            )}
          </div>
        );
      })}

      {profile && (
        <div className="flex flex-col gap-1.5 pt-1">
          {replyTarget && (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 text-xs text-steel/70">
              <span>
                Replying to <span className="font-semibold text-foreground">{replyTarget.replyTo.displayName}</span>
              </span>
              <button onClick={() => setReplyTarget(null)} aria-label="Cancel reply">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile.photoURL ?? undefined} alt={profile.displayName} />
              <AvatarFallback className="text-[11px]">{profile.displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={replyTarget ? `Reply to ${replyTarget.replyTo.displayName}…` : "Add a comment…"}
              className="h-9"
            />
            <Button size="sm" onClick={submit} disabled={!text.trim() || addComment.isPending}>
              {replyTarget ? "Reply" : "Send"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
