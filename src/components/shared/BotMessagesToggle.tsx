"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card } from "@/components/ui/card";

/** Lets a player switch off the PlayConnect Bot's own messages (welcome, match ready, come-back notes). */
export function BotMessagesToggle() {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [off, setOff] = useState<boolean | null>(null);
  if (!profile) return null;
  const isOff = off ?? profile.botMessagesOff === true;

  async function toggle() {
    if (!profile) return;
    setBusy(true);
    setError(false);
    const next = !isOff;
    try {
      await updateDoc(doc(db, "users", profile.uid), { botMessagesOff: next });
      setOff(next);
    } catch {
      setError(true);
    }
    setBusy(false);
  }

  return (
    <Card className="mt-4 flex items-center gap-4 p-5">
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-bold">🤖 PlayConnect Bot messages</p>
        <p className="mt-0.5 text-xs text-steel/60">Welcome tips, “your match is ready” and the occasional come-back note. The bot still answers when you ask it something.</p>
        {error && <p className="mt-1 text-xs text-signal-red">Couldn&apos;t save. Try again.</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!isOff}
        disabled={busy}
        onClick={toggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${isOff ? "bg-muted" : "bg-emerald-500"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${isOff ? "left-0.5" : "left-[22px]"}`} />
      </button>
    </Card>
  );
}
