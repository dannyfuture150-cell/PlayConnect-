"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { deleteLiveChat, endLive, sendLiveChat, useLiveChat, useLiveStream } from "@/hooks/useLive";
import { embedSrc, PLATFORM_LABEL } from "@/lib/liveEmbed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LiveWatchPage({ params }: { params: { id: string } }) {
  const { profile } = useAuth();
  const live = useLiveStream(params.id);
  const messages = useLiveChat(params.id);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [hostname, setHostname] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (live === undefined) return <div className="h-60 animate-pulse rounded-2xl bg-muted" />;
  if (live === null) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-steel/60">This stream couldn&apos;t be found.</p>
        <Link href="/live" className="mt-3 inline-block text-sm font-medium text-violet-glow hover:underline">
          Back to live
        </Link>
      </div>
    );
  }

  const isHost = profile?.uid === live.hostId;
  const isLive = live.status === "live";
  const src = hostname ? embedSrc(live.platform, live.url, live.ref, hostname) : null;

  async function handleSend() {
    if (!profile || !text.trim() || sending || !isLive) return;
    setSending(true);
    try {
      await sendLiveChat(params.id, { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL }, text.trim());
      setText("");
    } catch {
      /* keep the text so they can retry */
    } finally {
      setSending(false);
    }
  }

  async function handleEnd() {
    setEnding(true);
    try {
      await endLive(params.id);
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-black">
        {isLive && src ? (
          <div className="relative aspect-video w-full">
            <iframe
              src={src}
              title={live.title}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-white/80">
              {isLive
                ? `${PLATFORM_LABEL[live.platform]} streams open in their own app.`
                : "This stream has ended."}
            </p>
            {isLive && (
              <a href={live.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm">
                  <ExternalLink className="h-4 w-4" />
                  Watch on {PLATFORM_LABEL[live.platform]}
                </Button>
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1 rounded-full bg-signal-red px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
              </span>
            )}
            <h1 className="truncate font-display text-lg font-bold text-foreground">{live.title}</h1>
          </div>
          <Link href={`/profile/${live.host.username}`} className="text-xs text-steel/60 hover:underline">
            {live.host.displayName}
            {live.game ? ` · ${live.game}` : ""}
          </Link>
        </div>
        {isHost && isLive && (
          <Button size="sm" variant="outline" onClick={handleEnd} disabled={ending}>
            {ending ? "Ending…" : "End stream"}
          </Button>
        )}
      </div>

      <div className="flex h-80 flex-col rounded-2xl border border-border bg-card p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel/50">Live chat</p>
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {messages.length === 0 && <p className="text-xs text-steel/40">No messages yet — say something!</p>}
          {messages.map((m) => (
            <div key={m.id} className="group flex items-start gap-1.5 text-sm">
              <p className="min-w-0 flex-1 break-words">
                <span className={m.authorId === live.hostId ? "font-semibold text-violet-glow" : "font-semibold text-steel/70"}>
                  {m.author.displayName}
                </span>{" "}
                <span className="text-foreground">{m.text}</span>
              </p>
              {(isHost || m.authorId === profile?.uid) && (
                <button
                  onClick={() => deleteLiveChat(params.id, m.id).catch(() => {})}
                  className="shrink-0 p-1 text-steel/30 hover:text-signal-red"
                  aria-label="Delete message"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        {isLive ? (
          <div className="mt-2 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Chat…"
              maxLength={300}
            />
            <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-center text-xs text-steel/40">Chat is closed.</p>
        )}
      </div>
    </div>
  );
}
