"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StoryRing } from "@/components/shared/StoryRing";
import { Framed } from "@/components/stars/Framed";
import { PlayerName } from "@/components/stars/PlayerName";
import { VerifiedTick } from "@/components/shared/VerifiedBadge";
import { useEffect, useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { CornerUpLeft, ImagePlus, Send, Trash2, X } from "lucide-react";
import { db } from "@/lib/firebase/client";
import type { Community, GroupMessage } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { clockTime, dayLabel } from "@/lib/chatTime";
import { markCommunityChatSeen } from "@/hooks/useCommunities";
import { Linkify } from "@/components/shared/Linkify";
import { MediaLightbox } from "@/components/shared/MediaLightbox";
import { safeName, uploadFile, validateImageFile } from "@/lib/firebase/storage-helpers";
import { Card } from "@/components/ui/card";
import { MentionInput } from "@/components/shared/MentionInput";
import { StickerPicker, StickerView } from "@/components/chat/StickerPicker";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { useDraft } from "@/hooks/useDraft";
import { useStars } from "@/hooks/useStars";
import { bubbleStyle, wallpaperStyle } from "@/lib/starsCatalog";
import { notifyMentions } from "@/lib/mentions";
import { VoiceNoteControl } from "@/components/chat/VoiceNoteControl";
import { VoicePlayer } from "@/components/chat/VoicePlayer";
import { cn } from "@/lib/utils";

export function GroupChat({ community }: { community: Community }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text, setText] = useDraft(`group-${community.id}`);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{ file: File; type: "image"; preview: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; text: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ url: string; type: "image" | "video" } | null>(null);

  const myStars = useStars(profile?.uid);
  const isMember = !!profile && community.memberIds?.includes(profile.uid);
  const isAdmin = !!profile && community.moderatorIds?.includes(profile.uid);
  const canSend = isMember && ((community.chatMode ?? "admins") === "everyone" || isAdmin);

  useEffect(() => {
    if (!isMember) return;
    const q = query(collection(db, "communities", community.id, "chat"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupMessage)).reverse()),
      () => setError("Can't load chat — publish the latest Firestore rules.")
    );
  }, [community.id, isMember]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  // Reading the chat clears its "new messages" dot.
  useEffect(() => {
    if (!profile || !isMember || messages.length === 0) return;
    const last = messages[messages.length - 1];
    const lastMs = last.createdAt?.toMillis?.() ?? Date.now();
    if (last.authorId !== profile.uid && lastMs > (profile.communityChatSeen?.[community.id] ?? 0)) {
      markCommunityChatSeen(profile.uid, community.id, Date.now()).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isMember, profile?.uid]);

  if (!isMember) return null;

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    const err = validateImageFile(file);
    if (err) return setError(err);
    if (attachment) URL.revokeObjectURL(attachment.preview);
    setAttachment({ file, type: "image", preview: URL.createObjectURL(file) });
  }

  async function sendVoice(file: File, seconds: number) {
    if (!profile) return;
    const mediaUrl = await uploadFile(`communities/${community.id}/chat/${Date.now()}-${safeName(file.name)}`, file);
    await addDoc(collection(db, "communities", community.id, "chat"), {
      authorId: profile.uid,
      author: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL ?? null },
      text: "",
      mediaUrl,
      mediaType: "audio",
      mediaDuration: seconds,
      replyTo,
      createdAt: serverTimestamp(),
    });
    bumpChat("🎤 Voice note");
    setReplyTo(null);
  }

  /** Marks the group as having a new message and keeps its preview line in the Messages list up to date. */
  function bumpChat(preview: string) {
    if (!profile) return;
    updateDoc(doc(db, "communities", community.id), { lastChatAt: serverTimestamp(), lastChatBy: profile.uid }).catch(() => undefined);
    // Separate write so it never blocks the marker above (needs the latest Firestore rules).
    updateDoc(doc(db, "communities", community.id), { lastChatText: preview.slice(0, 80), lastChatName: (profile.displayName || "").split(" ")[0] }).catch(() => undefined);
  }

  async function sendQuick(t: string) {
    if (!profile || sending) return;
    setError(null);
    try {
      await addDoc(collection(db, "communities", community.id, "chat"), {
        authorId: profile.uid,
        author: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL ?? null },
        text: t,
        mediaUrl: null,
        mediaType: null,
        replyTo,
        createdAt: serverTimestamp(),
      });
      bumpChat(t);
      setReplyTo(null);
    } catch (e: any) {
      setError(e?.message?.includes("permission") ? "Couldn't send — publish the latest Firestore rules." : e?.message || "Couldn't send. Try again.");
    }
  }

  async function sendSticker(id: string) {
    if (!profile || sending) return;
    setError(null);
    try {
      await addDoc(collection(db, "communities", community.id, "chat"), {
        authorId: profile.uid,
        author: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL ?? null },
        text: "",
        sticker: id,
        mediaUrl: null,
        mediaType: null,
        replyTo,
        createdAt: serverTimestamp(),
      });
      bumpChat("🎟️ Sticker");
      setReplyTo(null);
    } catch (e: any) {
      setError(e?.message?.includes("permission") ? "Couldn't send — publish the latest Firestore rules." : e?.message || "Couldn't send. Try again.");
    }
  }

  async function send() {
    const t = text.trim();
    if ((!t && !attachment) || !profile || sending) return;
    setSending(true);
    setError(null);
    try {
      let mediaUrl: string | null = null;
      if (attachment) {
        mediaUrl = await uploadFile(`communities/${community.id}/chat/${Date.now()}-${safeName(attachment.file.name)}`, attachment.file);
      }
      await addDoc(collection(db, "communities", community.id, "chat"), {
        authorId: profile.uid,
        author: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL ?? null },
        text: t.slice(0, 1000),
        mediaUrl,
        mediaType: attachment?.type ?? null,
        replyTo,
        createdAt: serverTimestamp(),
      });
      // Tell other members there is something new in this chat.
      bumpChat(t || (attachment ? "📷 Photo" : ""));
      setText("");
      setReplyTo(null);
      if (t.includes("@")) {
        notifyMentions({
          text: t,
          from: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
          link: `/communities/${community.slug}`,
          onlyUids: community.memberIds,
        });
      }
      if (attachment) URL.revokeObjectURL(attachment.preview);
      setAttachment(null);
    } catch (e: any) {
      setError(e?.message?.includes("permission") ? "Couldn't send — publish the latest Firestore rules." : e?.message || "Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  let lastDay = "";
  return (
    <Card className="flex flex-col overflow-hidden rounded-none border-x-0 border-t-0 shadow-none md:rounded-2xl md:border-x md:border-t">
      <div className="hidden border-b border-border bg-card px-4 py-3 md:block">
        <h3 className="text-sm font-bold text-foreground">Group chat</h3>
        <p className="text-[11px] text-steel/50">
          {(community.chatMode ?? "admins") === "everyone" ? "All members can send messages" : "Only admins can send messages"}
        </p>
      </div>
      <div
        className="flex h-[calc(100dvh-10rem-env(safe-area-inset-top))] min-h-[14rem] flex-col md:h-[60vh] gap-1 overflow-y-auto bg-muted/50 px-3 py-3"
        style={wallpaperStyle(myStars.chat?.wallpaper) ?? { backgroundImage: "radial-gradient(hsl(var(--violet) / 0.10) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
      >
        {messages.length === 0 && <p className="py-6 text-center text-sm text-steel/50">No messages yet.</p>}
        {messages.map((m) => {
          const mine = m.authorId === profile?.uid;
          const ms = m.createdAt?.toMillis?.();
          const when = ms ? new Date(ms) : null;
          const day = when ? dayLabel(when) : "";
          const showDay = day && day !== lastDay;
          if (day) lastDay = day;
          const isAuthorAdmin = community.moderatorIds?.includes(m.authorId);
          return (
            <div key={m.id} className="flex flex-col gap-1">
              {showDay && <p className="my-1 self-center rounded-full bg-card px-3 py-0.5 text-[11px] text-steel/60 shadow-sm">{day}</p>}
              <div className={cn("group flex items-center gap-2", mine ? "justify-end" : "justify-start")}>
                {activeId === m.id && (
                  <button
                    type="button"
                    onClick={() => { setReplyTo({ id: m.id, name: mine ? "You" : m.author?.displayName ?? "", text: m.text || (m.sticker ? "🎟️ Sticker" : m.mediaType === "audio" ? "🎤 Voice note" : "📷 Photo") }); setActiveId(null); }}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1.5 text-[11px] font-medium text-steel/70"
                  >
                    <CornerUpLeft className="h-3.5 w-3.5" /> Reply
                  </button>
                )}
                {!mine && (
                  <Link href={`/profile/${m.author?.username ?? ""}`} className="self-end">
                    <Framed uid={m.authorId} thin><StoryRing uid={m.authorId}>
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={m.author?.photoURL ?? undefined} alt={m.author?.displayName} />
                        <AvatarFallback className="text-[10px]">{m.author?.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </StoryRing></Framed>
                  </Link>
                )}
                <div
                  onClick={() => { if (window.getSelection()?.toString()) return; setActiveId(activeId === m.id ? null : m.id); }}
                  style={m.sticker ? { background: "transparent", boxShadow: "none" } : mine ? bubbleStyle(myStars.chat?.bubble) : undefined}
                  className={cn("max-w-[80%] cursor-pointer select-text rounded-2xl px-3 py-2 shadow-sm", mine ? "rounded-tr-sm bg-brand-gradient text-white" : "rounded-tl-sm bg-card text-foreground")}
                >
                  {m.replyTo && (
                    <div className={cn("mb-1 rounded-lg border-l-4 px-2 py-1 text-xs", mine ? "border-white/70 bg-white/15" : "border-violet bg-black/5")}>
                      <p className="font-semibold">{m.replyTo.name}</p>
                      <p className="line-clamp-2 opacity-80">{m.replyTo.text}</p>
                    </div>
                  )}
                  {m.sticker && <StickerView id={m.sticker} />}
                  {m.mediaUrl && m.mediaType === "audio" && (
                    <VoicePlayer url={m.mediaUrl} duration={m.mediaDuration} mine={mine} />
                  )}
                  {m.mediaUrl && m.mediaType === "image" && (
                    <div role="button" onClick={(e) => { e.stopPropagation(); setViewer({ url: m.mediaUrl!, type: "image" }); }} className="mb-1 w-52 max-w-full overflow-hidden rounded-xl bg-black/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.mediaUrl} alt="" loading="lazy" className="block max-h-72 w-full object-contain" />
                    </div>
                  )}
                  {!mine && (
                    <p className="text-[11px] font-bold text-foreground">
                      <PlayerName uid={m.authorId} name={m.author?.displayName ?? ""} /><VerifiedTick uid={m.authorId} size={12} />
                      {isAuthorAdmin && <span className="ml-1 font-semibold text-green-600 dark:text-green-400">· {m.authorId === community.createdBy ? "Group admin" : "Admin"}</span>}
                    </p>
                  )}
                  {m.text && <p className="whitespace-pre-wrap break-words text-[15px]"><Linkify text={m.text} /></p>}
                  <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] opacity-70">
                    {(mine || isAdmin) && (
                      <button type="button" onClick={() => deleteDoc(doc(db, "communities", community.id, "chat", m.id)).catch(() => undefined)} title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    {when ? clockTime(when) : ""}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {canSend ? (
        <div className="border-t border-border bg-card p-2">
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border-l-4 border-violet bg-muted px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">Replying to {replyTo.name}</p>
                <p className="truncate text-steel/60">{replyTo.text}</p>
              </div>
              <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)} className="text-steel/60"><X className="h-4 w-4" /></button>
            </div>
          )}
          {attachment && (
            <div className="relative mb-2 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachment.preview} alt="" className="h-20 w-20 rounded-lg object-cover" />
              <button type="button" onClick={() => { URL.revokeObjectURL(attachment.preview); setAttachment(null); }} className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-950/70 p-1 text-white"><X className="h-3 w-3" /></button>
            </div>
          )}
        <QuickReplies disabled={sending} onPick={sendQuick} />
        <div className="relative flex items-end gap-2">
          <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          <button type="button" onClick={() => imageRef.current?.click()} className="shrink-0 rounded-lg p-2 text-steel/50 hover:bg-muted" title="Send a photo"><ImagePlus className="h-4 w-4" /></button>
          <StickerPicker disabled={sending} onPick={sendSticker} />
          <VoiceNoteControl disabled={sending} onError={setError} onSend={sendVoice} />
          <MentionInput
            value={text}
            onValueChange={setText}
            onSubmit={send}
            placeholder="Message"
            maxLength={1000}
            allowedUids={community.memberIds}
            className="rounded-3xl"
          />
          <button type="button" onClick={send} disabled={(!text.trim() && !attachment) || sending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
        {sending && attachment && <p className="mt-1 text-[11px] text-steel/60">Uploading…</p>}
        </div>
      ) : (
        <p className="border-t border-border p-3 text-center text-xs text-steel/50">Only admins can send messages in this group.</p>
      )}
      {error && <p className="px-4 pb-3 text-xs text-signal-red">{error}</p>}
      {viewer && <MediaLightbox url={viewer.url} type={viewer.type} onClose={() => setViewer(null)} />}
    </Card>
  );
}
