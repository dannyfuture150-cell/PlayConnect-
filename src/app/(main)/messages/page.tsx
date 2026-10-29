"use client";

import { Framed } from "@/components/stars/Framed";
import { PlayerName } from "@/components/stars/PlayerName";
import { StoryRing } from "@/components/shared/StoryRing";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Compass, MessageCircle, Search, Trash2, Users } from "lucide-react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { longPress } from "@/lib/longPress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { unreadAnnouncements, useChatUnreadCounts, useCommunities } from "@/hooks/useCommunities";
import { CreateCommunityDialog } from "@/components/communities/CreateCommunityDialog";
import type { Community, Thread } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useThreads } from "@/hooks/useMessages";
import { useBotInbox } from "@/hooks/useBotInbox";
import { usePresence } from "@/hooks/usePresence";
import { listTime } from "@/lib/chatTime";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/** Green dot on an avatar while that person is online. */
function OnlineDot({ uid }: { uid: string | undefined }) {
  const { online } = usePresence(uid);
  if (!online) return null;
  return <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />;
}

export default function MessagesPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: threads, isLoading } = useThreads(profile?.uid);

  const [sheet, setSheet] = useState<{ kind: "chat"; thread: Thread } | { kind: "group"; community: Community } | null>(null);
  const [search, setSearch] = useState("");
  const botInbox = useBotInbox(profile?.uid);
  const botUnread = (botInbox.data ?? []).filter((n) => !n.read).length;
  const botLast = (botInbox.data ?? [])[(botInbox.data ?? []).length - 1];
  const [filter, setFilter] = useState<"all" | "chats" | "groups">("all");
  const { data: communities } = useCommunities();
  const chatCounts = useChatUnreadCounts(profile?.uid, profile?.communityChatSeen);
  const myGroups = (communities ?? []).filter((c) => !!profile && c.memberIds?.includes(profile.uid));
  const shownGroups = myGroups.filter((c) => {
    // removed from the list, still a member; it comes back when there is new activity
    const hiddenAt = profile?.communityHidden?.[c.id];
    if (hiddenAt && hiddenAt >= Math.max(c.lastChatAt?.toMillis?.() ?? 0, c.lastAnnouncementAt?.toMillis?.() ?? 0)) return false;
    const q = search.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.game?.toLowerCase().includes(q);
  });
  const shownThreads = (threads ?? []).filter((t) => {
    // a chat you deleted stays hidden until a newer message arrives
    const cleared = profile ? t.clearedAt?.[profile.uid]?.toMillis?.() : undefined;
    if (cleared && cleared >= (t.lastMessageAt?.toMillis?.() ?? 0)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const otherUid = t.participantIds.find((id) => id !== profile?.uid);
    const o = otherUid ? t.participants[otherUid] : null;
    return !!o && (o.displayName?.toLowerCase().includes(q) || o.username?.toLowerCase().includes(q));
  });

  async function deleteChat(t: Thread) {
    if (!profile) return;
    setSheet(null);
    await updateDoc(doc(db, "threads", t.id), {
      [`clearedAt.${profile.uid}`]: serverTimestamp(),
      [`unreadCounts.${profile.uid}`]: 0,
    });
  }
  async function hideGroup(c: Community) {
    if (!profile) return;
    setSheet(null);
    await updateDoc(doc(db, "users", profile.uid), { [`communityHidden.${c.id}`]: Date.now() });
  }

  type Item = { kind: "group"; community: Community; ms: number } | { kind: "chat"; thread: Thread; ms: number };
  const merged: Item[] = [
    ...(filter !== "groups" ? shownThreads.map((thread): Item => ({ kind: "chat", thread, ms: thread.lastMessageAt?.toMillis?.() ?? 0 })) : []),
    ...(filter !== "chats"
      ? shownGroups.map((community): Item => ({
          kind: "group",
          community,
          ms: Math.max(community.lastChatAt?.toMillis?.() ?? 0, community.lastAnnouncementAt?.toMillis?.() ?? 0),
        }))
      : []),
  ].sort((a, b) => b.ms - a.ms);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-foreground">Chats</h1>
        <div className="flex items-center gap-2">
          <Link href="/communities" className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-xs font-semibold text-foreground">
            <Compass className="h-3.5 w-3.5" /> Find groups
          </Link>
          <CreateCommunityDialog />
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-steel/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats"
          className="h-11 w-full rounded-full bg-muted pl-10 pr-4 text-sm text-foreground placeholder:text-steel/40 focus:outline-none focus:ring-2 focus:ring-violet/40"
        />
      </div>

      <div className="flex gap-2">
        {([["all", "All"], ["chats", "Chats"], ["groups", "Groups"]] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === k ? "bg-violet text-white" : "bg-muted text-steel/70"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && (!threads || threads.length === 0) && myGroups.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-steel/30" />
          <p className="mt-3 text-sm text-steel/50">
            No chats yet. Visit a player&apos;s profile and tap &quot;Message&quot; to start one.
          </p>
        </div>
      )}

      <div className="-mx-4 flex flex-col overflow-hidden border-y border-border bg-card md:mx-0 md:rounded-2xl md:border">
        {!search.trim() && (
          <Link href="/messages/bot" className="flex items-center gap-3 border-b border-border/60 px-4 py-3 active:bg-muted hover:bg-muted/60">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-2xl">🤖</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-foreground">PlayConnect Bot</p>
              <p className={`truncate text-sm ${botUnread > 0 ? "font-medium text-foreground" : "text-steel/50"}`}>{botLast?.text ?? "Ask me how things work"}</p>
            </div>
            {botUnread > 0 && (
              <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">{botUnread}</span>
            )}
          </Link>
        )}
        {merged.map((item) => {
          if (item.kind === "group") {
            const c = item.community;
            const total = unreadAnnouncements(c, profile?.communitySeenCounts) + (chatCounts[c.id] ?? 0);
            return (
              <Link
                key={`g-${c.id}`}
                href={`/communities/${c.slug}`}
                {...longPress(() => setSheet({ kind: "group", community: c }))}
                className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0 active:bg-muted hover:bg-muted/60"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-brand-gradient">
                  {c.photoURL ? (
                    <Image src={c.photoURL} alt={c.name} fill className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">{c.name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold text-foreground">
                      <span className="truncate">{c.name}</span>
                      <Users className="h-3.5 w-3.5 shrink-0 text-steel/40" />
                    </p>
                    {item.ms > 0 && (
                      <span className={`shrink-0 text-[11px] ${total > 0 ? "font-semibold text-emerald-500" : "text-steel/40"}`}>
                        {listTime(new Date(item.ms))}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className={`truncate text-sm ${total > 0 ? "font-medium text-foreground" : "text-steel/50"}`}>
                      {c.lastChatText
                        ? `${c.lastChatName ? `${c.lastChatName}: ` : ""}${c.lastChatText}`
                        : c.lastAnnouncement || `${c.game} group`}
                    </p>
                    {total > 0 && (
                      <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
                        {total > 99 ? "99+" : total}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          }
          const thread = item.thread;
          const otherUid = thread.participantIds.find((id) => id !== profile?.uid);
          const other = otherUid ? thread.participants[otherUid] : null;
          if (!other) return null;

          // Per-chat unread count. Older threads (before counters existed)
          // fall back to a simple "1" if the last message is unseen.
          const lastRead = profile ? thread.lastReadBy?.[profile.uid] : undefined;
          const legacyUnread =
            !!thread.lastMessage &&
            thread.lastSenderId !== profile?.uid &&
            (!lastRead || (thread.lastMessageAt && thread.lastMessageAt.toMillis() > lastRead.toMillis()));
          const unread = profile ? thread.unreadCounts?.[profile.uid] ?? (legacyUnread ? 1 : 0) : 0;
          return (
            <Link
              key={thread.id}
              href={`/messages/${thread.id}`}
              {...longPress(() => setSheet({ kind: "chat", thread }))}
              className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0 active:bg-muted hover:bg-muted/60"
            >
              <div
                role="link"
                className="relative shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/profile/${other.username}`);
                }}
              >
                <Framed uid={otherUid}><StoryRing uid={otherUid}>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={other.photoURL ?? undefined} alt={other.displayName} />
                    <AvatarFallback>{other.displayName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </StoryRing></Framed>
                <OnlineDot uid={otherUid} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[15px] font-semibold text-foreground"><PlayerName uid={otherUid} name={other.displayName} /></p>
                  {thread.lastMessageAt && (
                    <span className={`shrink-0 text-[11px] ${unread > 0 ? "font-semibold text-emerald-500" : "text-steel/40"}`}>
                      {listTime(thread.lastMessageAt.toDate())}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${unread > 0 ? "font-medium text-foreground" : "text-steel/50"}`}>
                    {thread.lastMessage || "Say hello 👋"}
                  </p>
                  {unread > 0 && (
                    <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {!isLoading && merged.length === 0 && (threads?.length ?? 0) + myGroups.length > 0 && (
        <p className="text-center text-sm text-steel/50">No chats match &quot;{search}&quot;.</p>
      )}

      {sheet && (
        <Dialog open onOpenChange={(o) => !o && setSheet(null)}>
          <DialogContent className="max-w-sm">
            <DialogTitle>{sheet.kind === "chat" ? "Delete this chat?" : `Remove ${sheet.community.name} from your list?`}</DialogTitle>
            <p className="text-sm text-steel/60">
              {sheet.kind === "chat"
                ? "It's removed from your list. The other person keeps it, and it comes back if they message you again."
                : "You stay a member of the group. It only disappears from this list, and comes back when there's new activity. Find it again any time under Find groups."}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSheet(null)} className="h-11 flex-1 rounded-full bg-muted text-sm font-semibold text-foreground">Cancel</button>
              <button
                type="button"
                onClick={() => (sheet.kind === "chat" ? deleteChat(sheet.thread) : hideGroup(sheet.community))}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-signal-red text-sm font-semibold text-white"
              >
                <Trash2 className="h-4 w-4" /> {sheet.kind === "chat" ? "Delete" : "Remove"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
