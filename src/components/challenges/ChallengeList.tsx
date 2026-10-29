"use client";

import { useState } from "react";
import Link from "next/link";
import { Swords } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import {
  acceptChallenge, cancelChallenge, confirmChallengeResult, declineChallenge,
  disputeChallengeResult, reportChallengeResult, useChallenges,
} from "@/hooks/useChallenges";
import { threadIdFor } from "@/hooks/useMessages";
import type { Challenge } from "@/types";

export function Row({ c, uid }: { c: Challenge; uid: string }) {
  const other = c.challengerId === uid ? c.opponent : c.challenger;
  const mineToAnswer = c.status === "pending" && c.opponentId === uid;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(false);
    try { await fn(); } catch { setErr(true); }
    setBusy(false);
  };

  let status = "";
  if (c.status === "pending") status = c.challengerId === uid ? "Waiting for reply" : "Wants to play you";
  else if (c.status === "accepted") status = "Accepted — play your match";
  else if (c.status === "reported") status = c.reportedBy === uid ? "Waiting for them to confirm" : "Confirm the result";
  else if (c.status === "done") status = c.winnerId === uid ? "You won 🏆" : "You lost";
  else status = c.status === "declined" ? "Declined" : "Cancelled";

  return (
    <div className="space-y-2 border-b border-border/60 px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <Link href={`/profile/${other.username}`}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={other.photoURL ?? undefined} alt={other.displayName} />
            <AvatarFallback>{other.displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{other.displayName}</p>
          <p className="truncate text-xs text-steel/60">
            {c.game} · {c.bestOf === 1 ? "Single match" : `Best of ${c.bestOf}`}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-steel/70">{status}</span>
      </div>
      {c.note && <p className="text-xs text-steel/70">“{c.note}”</p>}

      <div className="flex flex-wrap gap-2">
        {mineToAnswer && (
          <>
            <Button size="sm" disabled={busy} onClick={() => run(() => acceptChallenge(c))}>Accept</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => declineChallenge(c))}>Decline</Button>
          </>
        )}
        {c.status === "pending" && c.challengerId === uid && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => cancelChallenge(c))}>Cancel</Button>
        )}
        {c.status === "accepted" && (
          <>
            <Link href={`/messages/${threadIdFor(uid, other.uid)}`}><Button size="sm" variant="outline">Open chat</Button></Link>
            <Button size="sm" disabled={busy} onClick={() => run(() => reportChallengeResult(c, uid, uid))}>I won</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => reportChallengeResult(c, uid, other.uid))}>I lost</Button>
          </>
        )}
        {c.status === "reported" && c.reportedBy !== uid && (
          <>
            <span className="self-center text-xs text-steel/70">
              They say {c.reportedWinnerId === uid ? "you won" : "they won"}.
            </span>
            <Button size="sm" disabled={busy} onClick={() => run(() => confirmChallengeResult(c))}>Confirm</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => disputeChallengeResult(c))}>Dispute</Button>
          </>
        )}
      </div>
      {err && <p className="text-xs text-signal-red">That didn&apos;t work. Try again.</p>}
    </div>
  );
}

/** Challenges you sent or received, with accept / decline / result actions. */
export function ChallengeList() {
  const { profile } = useAuth();
  const { items, loading } = useChallenges(profile?.uid);
  if (!profile || loading) return null;
  const active = items.filter((c) => ["pending", "accepted", "reported"].includes(c.status));
  const past = items.filter((c) => !["pending", "accepted", "reported"].includes(c.status)).slice(0, 10);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-steel/50">Challenges</h2>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-steel/60">
          <Swords className="h-5 w-5 shrink-0" />
          Open any player&apos;s profile and tap Challenge to start a 1v1.
        </div>
      ) : (
        <div className="-mx-4 overflow-hidden border-y border-border bg-card md:mx-0 md:rounded-2xl md:border">
          {active.map((c) => <Row key={c.id} c={c} uid={profile.uid} />)}
          {past.map((c) => <Row key={c.id} c={c} uid={profile.uid} />)}
        </div>
      )}
    </section>
  );
}
