"use client";

import { useState } from "react";
import { Swords } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import { LEADERBOARD_GAMES } from "@/lib/leaderboardGames";
import { sendChallenge } from "@/hooks/useChallenges";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types";

/** "Challenge" button on a profile: pick a game and format, send a 1v1 request. */
export function ChallengeButton({ target }: { target: UserProfile }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const games = Array.from(new Set([...(target.favoriteGames ?? []), ...(profile?.favoriteGames ?? []), ...LEADERBOARD_GAMES]));
  const [game, setGame] = useState(target.favoriteGames?.[0] ?? games[0]);
  const [bestOf, setBestOf] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!profile || profile.uid === target.uid) return null;

  async function send() {
    if (!profile) return;
    setBusy(true);
    setErr(null);
    try {
      await sendChallenge({
        from: { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL },
        to: { uid: target.uid, username: target.username, displayName: target.displayName, photoURL: target.photoURL },
        game,
        bestOf,
        note: note.trim(),
      });
      setSent(true);
    } catch {
      setErr("Couldn't send the challenge. Try again.");
    }
    setBusy(false);
  }

  return (
    <>
      <Button variant="outline" onClick={() => { setSent(false); setOpen(true); }}>
        <Swords className="mr-1.5 h-4 w-4" /> Challenge
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Challenge {target.displayName}</DialogTitle>
          {sent ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-steel/80">Challenge sent! {target.displayName} will see it under My stuff and get a notification.</p>
              <Button className="w-full" onClick={() => setOpen(false)}>Done</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium">Game</label>
              <select value={game} onChange={(e) => setGame(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground">
                {games.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <label className="block text-sm font-medium">Format</label>
              <div className="flex gap-2">
                {[1, 3, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setBestOf(n)}
                    className={cn("flex-1 rounded-xl border py-2 text-sm font-semibold", bestOf === n ? "border-foreground bg-foreground text-background" : "border-border text-steel/70")}
                  >
                    {n === 1 ? "Single match" : `Best of ${n}`}
                  </button>
                ))}
              </div>
              <Input placeholder="Message (optional) — e.g. tonight 8pm" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} />
              {err && <p className="text-sm text-signal-red">{err}</p>}
              <Button className="w-full" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send challenge"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
