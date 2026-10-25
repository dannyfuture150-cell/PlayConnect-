"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { callStars, useStars } from "@/hooks/useStars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Info = Awaited<ReturnType<typeof callStars>>;

/** Send PlayCoins to another player. Unlocked for players who joined a tournament and have posted a few times. */
export function SendCoins() {
  const { profile } = useAuth();
  const stars = useStars(profile?.uid);
  const [info, setInfo] = useState<Info | null>(null);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function load() {
    callStars({ action: "sendInfo" }).then(setInfo).catch(() => undefined);
  }
  useEffect(() => {
    // /stars?to=username pre-fills the name
    try {
      const t = new URLSearchParams(window.location.search).get("to");
      if (t) setTo(t.replace(/[^a-zA-Z0-9_]/g, ""));
    } catch {}
  }, []);
  useEffect(() => {
    if (profile?.uid) load();
  }, [profile?.uid]);

  if (!profile) return null;

  async function send() {
    const n = Math.floor(Number(amount));
    if (!to.trim() || !(n >= 1) || busy) return;
    if (!confirm(`Send ${n} PlayCoins to @${to.trim().replace(/^@/, "")}? This can't be undone.`)) return;
    setBusy(true);
    setMsg(null);
    const r = await callStars({ action: "send", to, amount: n });
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: `Sent ${r.sent} 🪙 to @${r.to}.` });
      setAmount("");
      load();
    } else {
      setMsg({ ok: false, text: r.error ?? "That didn't work." });
    }
  }

  const unlocked = !!info?.ok && !!info.eligible;
  const left = info?.ok ? Math.max(0, (info.dailyLimit ?? 0) - (info.sentToday ?? 0)) : 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 font-display text-lg font-bold">
        <Send className="h-5 w-5" /> Send PlayCoins
      </p>
      {!info?.ok ? (
        <p className="mt-1 text-xs text-steel/60">{info ? info.error ?? "Couldn't check right now." : "Checking…"}</p>
      ) : !unlocked ? (
        <div className="mt-1 space-y-1 text-sm text-steel/70">
          <p>Sending unlocks when you have joined a tournament and made at least {info.minPosts} posts.</p>
          <p className="text-xs">
            <span className={(info.joined ?? 0) >= (info.minTournaments ?? 1) ? "text-emerald-500" : ""}>Tournaments joined: {info.joined ?? 0}/{info.minTournaments}</span>
            {" · "}
            <span className={(info.posts ?? 0) >= (info.minPosts ?? 3) ? "text-emerald-500" : ""}>Posts: {info.posts ?? 0}/{info.minPosts}</span>
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-steel/60">
            Send up to {info.maxEach} 🪙 at a time, {left} more today. You have {stars.balance} 🪙. The other player must also have joined a tournament and made {info.minPosts}+ posts. Coins you send can&apos;t be taken back, so check the username.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-steel/60">@</span>
              <Input value={to} onChange={(e) => setTo(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="username" autoCapitalize="none" autoCorrect="off" />
            </div>
            <div className="flex items-center gap-2">
              <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="How many 🪙" />
              <Button onClick={send} disabled={busy || !to.trim() || !(Number(amount) >= 1)}>{busy ? "Sending…" : "Send"}</Button>
            </div>
          </div>
        </>
      )}
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-500" : "text-signal-red"}`}>{msg.text}</p>}
    </section>
  );
}
