"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import { useBotInbox, useMarkBotRead } from "@/hooks/useBotInbox";
import { answerFor, BOT_ANSWERS, BOT_FALLBACK, BOT_GREETING } from "@/lib/helpBot";

interface Msg {
  id: number;
  from: "bot" | "me";
  text: string;
  link?: { label: string; href: string };
}

/** A chat with the PlayConnect Bot. Everything happens on the phone: nothing is saved or sent anywhere. */
export default function BotChatPage() {
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: "bot", text: BOT_GREETING }]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const { profile } = useAuth();
  const inbox = useBotInbox(profile?.uid);
  const markRead = useMarkBotRead(profile?.uid);

  // opening the chat reads the bot's messages
  useEffect(() => {
    if (inbox.data && inbox.data.some((n) => !n.read)) void markRead(inbox.data);
  }, [inbox.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing]);

  function ask(question: string) {
    const q = question.trim();
    if (!q || typing) return;
    setMsgs((m) => [...m, { id: nextId.current++, from: "me", text: q }]);
    setText("");
    setTyping(true);
    const found = answerFor(q);
    setTimeout(() => {
      setMsgs((m) => [...m, { id: nextId.current++, from: "bot", text: found?.text ?? BOT_FALLBACK, link: found?.link }]);
      setTyping(false);
    }, 500);
  }

  return (
    <div className="flex min-h-[70vh] flex-col gap-3">
      <div className="flex items-center gap-3">
        <Link href="/messages" aria-label="Back" className="rounded-full p-2 text-steel/70 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-xl">🤖</span>
        <div>
          <p className="font-display text-base font-bold">PlayConnect Bot</p>
          <p className="text-xs text-steel/50">Answers common questions. Not a real person.</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {(inbox.data ?? []).map((n) => (
          <div key={n.id} className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-foreground">
              <p className="whitespace-pre-wrap">{n.text}</p>
              {n.link && n.link !== "/messages/bot" && (
                <Link href={n.link} className="mt-2 inline-block rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground">
                  Open →
                </Link>
              )}
              <p className="mt-1 text-[10px] text-steel/40">{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</p>
            </div>
          </div>
        ))}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.from === "me" ? "bg-brand-gradient text-white" : "bg-muted text-foreground"}`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.link && (
                <Link href={m.link.href} className="mt-2 inline-block rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground">
                  {m.link.label} →
                </Link>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-steel/50">typing…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {(["app", "gaming"] as const).map((g) => (
        <div key={g}>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-steel/50">{g === "app" ? "Using PlayConnect" : "Gaming tips"}</p>
          <div className="flex flex-wrap gap-2">
            {BOT_ANSWERS.filter((a) => (a.group ?? "app") === g).map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={typing}
                onClick={() => ask(a.topic)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-steel/80 active:scale-95 disabled:opacity-40"
              >
                {a.topic}
              </button>
            ))}
          </div>
        </div>
      ))}

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question…" maxLength={200} className="rounded-3xl" />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={!text.trim() || typing} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
