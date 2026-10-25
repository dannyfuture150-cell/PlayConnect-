"use client";

import { Framed } from "@/components/stars/Framed";
import { PlayerName } from "@/components/stars/PlayerName";
import { StoryRing } from "@/components/shared/StoryRing";
import { VerifiedTick } from "@/components/shared/VerifiedBadge";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Copy, CornerUpLeft, ImagePlus, Play, Search, RotateCw, Send, Trash2, Video, X } from "lucide-react";
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { longPress } from "@/lib/longPress";
import { getOrCreateThread, markThreadRead, useDeleteMessage, useSendMessage, useThreadMessages } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { clockTime, dayLabel, lastSeenLabel } from "@/lib/chatTime";
import { Linkify } from "@/components/shared/Linkify";
import { MediaLightbox } from "@/components/shared/MediaLightbox";
import { videoPoster, validateImageFile, validateVideoFile } from "@/lib/firebase/storage-helpers";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/PageLoader";
import { VoiceNoteControl } from "@/components/chat/VoiceNoteControl";
import { VoicePlayer } from "@/components/chat/VoicePlayer";
import { cn } from "@/lib/utils";
import type { PostAuthorSnapshot } from "@/types";

export default function ChatPage({ params }: { params: { threadId: string } }) {
  const { profile } = useAuth();
  const [other, setOther] = useState<PostAuthorSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [attachment, setAttachment] = useState<{ file: File; type: "image" | "video"; preview: string } | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [checkingAttachment, setCheckingAttachment] = useState(false);

  const { messages, loading } = useThreadMessages(ready ? params.threadId : "");
  const sendMessage = useSendMessage(params.threadId);
  const deleteMessage = useDeleteMessage(params.threadId);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyText(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; text: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [otherTypingAt, setOtherTypingAt] = useState<number>(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const lastTypingWrite = useRef(0);
  const [viewer, setViewer] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const { online, lastActive } = usePresence(other?.uid);

  // "typing…": watch the other person's typing stamp on the thread document.
  useEffect(() => {
    if (!ready || !other) return;
    return onSnapshot(doc(db, "threads", params.threadId), (snap) => {
      const ts = snap.data()?.typing?.[other.uid];
      setOtherTypingAt(ts?.toMillis ? ts.toMillis() : 0);
    }, () => {});
  }, [ready, other, params.threadId]);
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);
  const otherTyping = otherTypingAt > 0 && nowTick - otherTypingAt < 5000;

  function noteTyping(value: string) {
    setText(value);
    if (!profile || !value) return;
    const now = Date.now();
    if (now - lastTypingWrite.current < 2500) return;
    lastTypingWrite.current = now;
    updateDoc(doc(db, "threads", params.threadId), { [`typing.${profile.uid}`]: serverTimestamp() }).catch(() => {});
  }

  const setup = useCallback(async () => {
    if (!profile) return;
    setLoadError(null);
    const otherUid = params.threadId.split("_").find((id) => id !== profile.uid);
    if (!otherUid) {
      setLoadError("That conversation link looks invalid.");
      return;
    }

    try {
      const otherSnap = await getDoc(doc(db, "users", otherUid));
      if (!otherSnap.exists()) {
        setLoadError("Couldn't find that player.");
        return;
      }
      const otherData = otherSnap.data();
      const otherProfile: PostAuthorSnapshot = {
        uid: otherUid,
        username: otherData.username,
        displayName: otherData.displayName,
        photoURL: otherData.photoURL,
      };

      const me: PostAuthorSnapshot = {
        uid: profile.uid,
        username: profile.username,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
      };
      const threadId = await getOrCreateThread(me, otherProfile);
      await markThreadRead(threadId, profile.uid);
      setOther(otherProfile);
      setReady(true);
    } catch (err) {
      setLoadError((err as Error).message || "Couldn't open this conversation.");
    }
  }, [profile?.uid, profile?.username, profile?.displayName, profile?.photoURL, params.threadId]);

  useEffect(() => {
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup, attempt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (ready && profile?.uid) markThreadRead(params.threadId, profile.uid).catch(() => {});
  }, [messages.length, ready, profile?.uid, params.threadId]);

  function clearAttachment() {
    if (attachment) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachError(null);
    const err = validateImageFile(file);
    if (err) {
      setAttachError(err);
      return;
    }
    clearAttachment();
    setAttachment({ file, type: "image", preview: URL.createObjectURL(file) });
  }

  async function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachError(null);
    setCheckingAttachment(true);
    const err = await validateVideoFile(file);
    setCheckingAttachment(false);
    if (err) {
      setAttachError(err);
      return;
    }
    clearAttachment();
    setAttachment({ file, type: "video", preview: URL.createObjectURL(file) });
  }

  async function handleSend() {
    if (!profile || (!text.trim() && !attachment) || sendMessage.isPending) return;
    try {
      await sendMessage.mutateAsync({
        text: text.trim(),
        senderId: profile.uid,
        media: attachment ? { file: attachment.file, type: attachment.type } : undefined,
        replyTo,
      });
      setText("");
      setReplyTo(null);
      clearAttachment();
    } catch {
      setAttachError("Couldn't send that — please try again.");
    }
  }

  if (loadError) {
    return (
      <div className="flex h-[calc(100dvh-11rem)] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-4 text-center md:h-[calc(100vh-6rem)]">
        <p className="text-sm text-signal-red">{loadError}</p>
        <Button variant="outline" size="sm" onClick={() => setAttempt((a) => a + 1)}>
          <RotateCw className="h-3.5 w-3.5" />
          Try again
        </Button>
        <Link href="/messages" className="text-xs text-steel/50 hover:underline">
          Back to messages
        </Link>
      </div>
    );
  }

  if (!ready || !other) return <PageLoader />;

  const shown = query.trim() ? messages.filter((m) => m.text?.toLowerCase().includes(query.trim().toLowerCase())) : messages;

  return (
    <div className="-mx-4 -mt-6 flex h-[calc(100dvh-1.5rem-env(safe-area-inset-top))] flex-col overflow-hidden border-y border-border bg-card md:mx-0 md:mt-0 md:h-[calc(100vh-6rem)] md:rounded-2xl md:border">
      <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2.5">
        <Link href="/messages" className="text-steel/50 hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link href={`/profile/${other.username}`} className="relative">
          <Framed uid={other.uid} thin><StoryRing uid={other.uid}><Avatar>
            <AvatarImage src={other.photoURL ?? undefined} alt={other.displayName} />
            <AvatarFallback>{other.displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar></StoryRing></Framed>
          {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />}
        </Link>
        <Link href={`/profile/${other.username}`} className="min-w-0">
          <p className="flex items-center truncate text-sm font-semibold text-foreground"><PlayerName uid={other.uid} name={other.displayName} /><VerifiedTick uid={other.uid} /></p>
          <p className={cn("truncate text-xs", otherTyping || online ? "font-medium text-emerald-500" : "text-steel/50")}>
            {otherTyping ? "typing…" : online ? "Online" : lastActive ? lastSeenLabel(lastActive) : `@${other.username}`}
          </p>
        </Link>
        <button
          type="button"
          aria-label="Search in chat"
          onClick={() => { setSearching((v) => !v); setQuery(""); }}
          className="ml-auto rounded-lg p-2 text-steel/60 hover:bg-muted"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
      {searching && (
        <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
          <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this chat…" />
          <span className="shrink-0 text-xs text-steel/50">{query ? `${shown.length} found` : ""}</span>
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto bg-muted/50 px-3 py-4"
        style={{ backgroundImage: "radial-gradient(hsl(var(--violet) / 0.10) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
      >
        <p className="mx-auto max-w-xs rounded-xl bg-card px-3 py-1.5 text-center text-[11px] text-steel/60 shadow-sm">
          🔒 Private chat — only you and the other person can see these messages.
        </p>
        {loading && <p className="text-center text-xs text-steel/40">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-steel/40">Say hello 👋 — this is the start of your conversation.</p>
        )}
        <div className="mt-3 flex flex-col gap-1">
          {shown.map((m, idx) => {
            const isMine = m.senderId === profile?.uid;
            const showActions = activeMessageId === m.id;
            const sentAt: Date | null = m.createdAt?.toDate ? m.createdAt.toDate() : null;
            const prevTs = idx > 0 ? shown[idx - 1].createdAt : null;
            const prevAt: Date | null = prevTs?.toDate ? prevTs.toDate() : null;
            const newDay = !!sentAt && (!prevAt || prevAt.toDateString() !== sentAt.toDateString());
            return (
              <Fragment key={m.id}>
              {newDay && sentAt && (
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-steel/60">{dayLabel(sentAt)}</span>
                </div>
              )}
              <div className={cn("flex items-center gap-2", isMine ? "justify-end" : "justify-start")}>
                {showActions && (
                  <button
                    onClick={() => { setReplyTo({ id: m.id, name: isMine ? "You" : other.displayName, text: m.text || (m.mediaType === "audio" ? "🎤 Voice note" : m.mediaType === "video" ? "📹 Video" : "📷 Photo") }); setActiveMessageId(null); }}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1.5 text-[11px] font-medium text-steel/70"
                    title="Reply"
                  >
                    <CornerUpLeft className="h-3.5 w-3.5" /> Reply
                  </button>
                )}
                {showActions && m.text && (
                  <button
                    onClick={() => copyText(m.id, m.text)}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1.5 text-[11px] font-medium text-steel/70"
                    title="Copy message"
                  >
                    <Copy className="h-3.5 w-3.5" /> {copiedId === m.id ? "Copied" : "Copy"}
                  </button>
                )}
                <div
                  {...(isMine
                    ? longPress(() => {
                        if (confirm("Delete this message?")) deleteMessage.mutate(m.id);
                      })
                    : {})}
                  onClick={() => {
                    // Don't toggle the action buttons while the person is selecting text.
                    if (window.getSelection()?.toString()) return;
                    setActiveMessageId(activeMessageId === m.id ? null : m.id);
                  }}
                  className={cn(
                    "max-w-[80%] cursor-pointer select-text overflow-hidden rounded-2xl text-left text-[15px] shadow-sm",
                    isMine ? "rounded-tr-sm" : "rounded-tl-sm",
                    m.mediaUrl && m.mediaType !== "audio" ? "p-1" : "px-3.5 py-2",
                    isMine ? "bg-brand-gradient text-white" : "bg-card text-foreground"
                  )}
                >
                  {m.replyTo && (
                    <div className={cn("mb-1 rounded-lg border-l-4 px-2 py-1 text-xs", isMine ? "border-white/70 bg-white/15" : "border-violet bg-black/5")}>
                      <p className="font-semibold">{m.replyTo.name}</p>
                      <p className="line-clamp-2 opacity-80">{m.replyTo.text}</p>
                    </div>
                  )}
                  {m.mediaUrl && m.mediaType === "audio" && (
                    <VoicePlayer url={m.mediaUrl} duration={m.mediaDuration} mine={isMine} />
                  )}
                  {m.mediaUrl && m.mediaType === "image" && (
                    <div
                      role="button"
                      onClick={(e) => { e.stopPropagation(); setViewer({ url: m.mediaUrl!, type: "image" }); }}
                      className="w-56 max-w-full cursor-pointer overflow-hidden rounded-xl bg-black/20"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.mediaUrl} alt="" loading="lazy" className="block max-h-80 w-full object-contain" />
                    </div>
                  )}
                  {m.mediaUrl && m.mediaType === "video" && (
                    <div
                      role="button"
                      onClick={(e) => { e.stopPropagation(); setViewer({ url: m.mediaUrl!, type: "video" }); }}
                      className="relative w-56 max-w-full cursor-pointer overflow-hidden rounded-xl bg-black"
                    >
                      {videoPoster(m.mediaUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={videoPoster(m.mediaUrl)} alt="" loading="lazy" className="block max-h-80 min-h-[8rem] w-full object-contain" />
                      ) : (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video src={m.mediaUrl} preload="metadata" muted playsInline className="block max-h-80 min-h-[8rem] w-full object-contain" />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white">
                          <Play className="ml-0.5 h-6 w-6 fill-white" />
                        </span>
                      </span>
                    </div>
                  )}
                  {m.text && <p className={cn("whitespace-pre-wrap break-words", m.mediaUrl && m.mediaType !== "audio" && "px-2 py-1.5")}><Linkify text={m.text} /></p>}
                  <span className={cn("mt-0.5 block text-right text-[10px]", isMine ? "text-white/75" : "text-steel/50", m.mediaUrl && m.mediaType !== "audio" && "px-2 pb-1")}>
                    {sentAt ? clockTime(sentAt) : "sending…"}
                  </span>
                </div>
              </div>
              </Fragment>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg border-l-4 border-violet bg-muted px-3 py-2 text-xs">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">Replying to {replyTo.name}</p>
            <p className="truncate text-steel/60">{replyTo.text}</p>
          </div>
          <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)} className="text-steel/60"><X className="h-4 w-4" /></button>
        </div>
      )}

      {attachment && (
        <div className="relative mx-3 mb-2 w-fit">
          {attachment.type === "image" ? (
            <Image src={attachment.preview} alt="" width={80} height={80} className="h-20 w-20 rounded-lg object-cover" unoptimized />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={attachment.preview} className="h-20 w-20 rounded-lg object-cover" />
          )}
          <button
            onClick={clearAttachment}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-950/70 p-1 text-white hover:bg-slate-950/90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {checkingAttachment && <p className="mx-3 mb-1 text-xs text-steel/50">Checking video…</p>}
      {attachError && <p className="mx-3 mb-1 text-xs text-signal-red">{attachError}</p>}

      <div className="relative flex items-center gap-1.5 border-t border-border bg-card px-2 py-2">
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={checkingAttachment}
          className="shrink-0 rounded-lg p-2 text-steel/50 hover:bg-muted hover:text-steel disabled:opacity-40"
          title="Send an image"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={checkingAttachment}
          className="shrink-0 rounded-lg p-2 text-steel/50 hover:bg-muted hover:text-steel disabled:opacity-40"
          title="Send a video"
        >
          <Video className="h-4 w-4" />
        </button>
        <VoiceNoteControl
          disabled={checkingAttachment || sendMessage.isPending}
          onError={setAttachError}
          onSend={async (file, seconds) => {
            if (!profile) return;
            await sendMessage.mutateAsync({
              text: "",
              senderId: profile.uid,
              media: { file, type: "audio", duration: seconds },
              replyTo,
            });
            setReplyTo(null);
          }}
        />
        <Input
          value={text}
          onChange={(e) => noteTyping(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message"
          className="h-11 rounded-full bg-muted px-4"
        />
        <Button size="icon" className="h-11 w-11 shrink-0 rounded-full" onClick={handleSend} disabled={(!text.trim() && !attachment) || sendMessage.isPending || checkingAttachment}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {viewer && <MediaLightbox url={viewer.url} type={viewer.type} onClose={() => setViewer(null)} />}
    </div>
  );
}
