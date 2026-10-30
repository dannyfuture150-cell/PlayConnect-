"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import { useBotName } from "@/hooks/useBotName";
import { useBotInbox, useMarkBotRead } from "@/hooks/useBotInbox";
import { answerFor, BOT_FALLBACK, BOT_GREETING } from "@/lib/helpBot";

const QUICK_TOPICS = ["Join a tournament", "Play 1v1 now", "What are PlayCoins?"];

const STORE_KEY = "pc_bot_chat";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Chats with the bot are kept on this phone for 24 hours, then they disappear. */
function loadChat(): Msg[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Msg[];
    const now = Date.now();
    return Array.isArray(list) ? list.filter((m) => m && typeof m.at === "number" && now - m.at < DAY_MS) : [];
  } catch {
    return [];
  }
}

interface Msg {
  id: number;
  at: number;
  from: "bot" | "me";
  text: string;
  link?: { label: string; href: string };
}

/** A chat with the PlayConnect Bot. Everything happens on the phone: nothing is saved or sent anywhere. */
export default function BotChatPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const { profile } = useAuth();
  const { name: botName, setName: setBotName } = useBotName();
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const inbox = useBotInbox(profile?.uid);
  const markRead = useMarkBotRead(profile?.uid);

  // opening the chat reads the bot's messages
  useEffect(() => {
    if (inbox.data && inbox.data.some((n) => !n.read)) void markRead(inbox.data);
  }, [inbox.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // bring back the last 24 hours of this chat
  useEffect(() => {
    const saved = loadChat();
    nextId.current = saved.reduce((mx, m) => Math.max(mx, m.id), 0) + 1;
    setMsgs(saved);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(msgs));
    } catch {
      /* storage full or blocked: the chat just won't be remembered */
    }
  }, [msgs, loaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing]);

  function ask(question: string) {
    const q = question.trim();
    if (!q || typing) return;
    setMsgs((m) => [...m, { id: nextId.current++, at: Date.now(), from: "me", text: q }]);
    setText("");
    setTyping(true);
    const found = answerFor(q);
    setTimeout(() => {
      setMsgs((m) => [...m, { id: nextId.current++, at: Date.now(), from: "bot", text: found?.text ?? BOT_FALLBACK, link: found?.link }]);
      setTyping(false);
    }, 500);
  }

  return (
    <div className="-mx-4 -mt-6 flex h-[calc(100dvh-1.5rem-env(safe-area-inset-top))] flex-col overflow-hidden border-y border-border bg-card md:mx-0 md:mt-0 md:h-[calc(100vh-6rem)] md:rounded-2xl md:border">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <Link href="/messages" aria-label="Back" className="rounded-full p-2 text-steel/70 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-xl">🤖</span>
        <div>
          {renaming ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                setBotName(draftName);
                setRenaming(false);
              }}
            >
              <Input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={24} placeholder="Name your bot" className="h-8 w-40 text-sm" />
              <button type="submit" aria-label="Save name" className="rounded-full p-1.5 text-emerald-600 hover:bg-muted">
                <Check className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <p className="flex items-center gap-1.5 font-display text-base font-bold">
              {botName}
              <button
                type="button"
                aria-label="Rename bot"
                onClick={() => {
                  setDraftName(botName);
                  setRenaming(true);
                }}
                className="rounded-full p-1 text-steel/50 hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </p>
          )}
          <p className="text-xs text-steel/50">Answers common questions. Not a real person.</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
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
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-foreground">
            <p className="whitespace-pre-wrap">{BOT_GREETING}</p>
          </div>
        </div>
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

      <div className="flex flex-wrap gap-2 border-t border-border px-3 pt-2">
        {QUICK_TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            disabled={typing}
            onClick={() => ask(t)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-steel/80 active:scale-95 disabled:opacity-40"
          >
            {t}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-2 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
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
