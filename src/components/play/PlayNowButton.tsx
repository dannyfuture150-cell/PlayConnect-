"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Swords, X } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useChallenges } from "@/hooks/useChallenges";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Row as ChallengeRow } from "@/components/challenges/ChallengeList";
import { OpenGameButton } from "@/components/tournaments/OpenGameButton";
import { callQuick, QUICK_GAMES } from "@/lib/quickMatch";
import { connectedGames, gameForTournament } from "@/lib/gameAccounts";
import type { Challenge, UserProfile } from "@/types";

const POLL_MS = 6000;
const GAME_KEY = "pc_quick_game";

type Stage = "pick" | "searching" | "matched" | "expired";

/** The glowing "Play 1v1 Now" button on the feed, and the waiting room it opens. */
export function PlayNowButton() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("pick");
  const [game, setGame] = useState<string>(QUICK_GAMES[0]);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const alive = useRef(false);
  const { items } = useChallenges(profile?.uid);

  // remember the last game; the first time, suggest one the player has connected
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GAME_KEY);
      if (saved && (QUICK_GAMES as readonly string[]).includes(saved)) {
        setGame(saved);
        return;
      }
    } catch {
      /* no saved choice */
    }
    const first = connectedGames(profile)[0];
    if (first && (QUICK_GAMES as readonly string[]).includes(first.def.label)) setGame(first.def.label);
  }, [profile?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // the waiting loop: ask the server every few seconds until matched, expired, or the player leaves
  useEffect(() => {
    if (stage !== "searching") return;
    alive.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const r = await callQuick({ action: "poll" });
      if (!alive.current) return;
      if (r.ok && r.state === "matched" && r.challengeId) {
        setChallengeId(r.challengeId);
        setStage("matched");
        return;
      }
      if (r.ok && (r.state === "expired" || r.state === "idle")) {
        setStage("expired");
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      alive.current = false;
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, [stage]);

  if (!profile) return null;

  async function start() {
    setError(null);
    setSeconds(0);
    try {
      localStorage.setItem(GAME_KEY, game);
    } catch {
      /* fine */
    }
    const r = await callQuick({ action: "join", game });
    if (!r.ok) {
      setError(r.error ?? "Couldn't start. Try again.");
      return;
    }
    if (r.state === "matched" && r.challengeId) {
      setChallengeId(r.challengeId);
      setStage("matched");
    } else {
      setStage("searching");
    }
  }

  async function cancel() {
    alive.current = false;
    await callQuick({ action: "leave" });
    setStage("pick");
  }

  function onOpenChange(next: boolean) {
    if (!next && stage === "searching") void callQuick({ action: "leave" });
    if (!next && stage !== "matched") setStage("pick");
    setOpen(next);
  }

  const challenge = challengeId ? items.find((c) => c.id === challengeId) : undefined;
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // a quick match that is still running opens straight back into it
          const running = items.find((c) => (c as Challenge & { quick?: boolean }).quick && (c.status === "accepted" || c.status === "reported"));
          if (running) {
            setChallengeId(running.id);
            setStage("matched");
          } else if (stage === "matched") {
            setStage("pick");
          }
          setOpen(true);
        }}
        className="pc-glow flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-4 text-lg font-extrabold tracking-wide text-white active:scale-[0.99]"
      >
        <Swords className="h-6 w-6" /> Play 1v1 Now
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogTitle>{stage === "matched" ? "Opponent found!" : "Play 1v1 Now"}</DialogTitle>

          {stage === "pick" && (
            <div className="mt-3 flex flex-col gap-4">
              <p className="text-sm text-steel/70">Pick a game. As soon as another player also taps Play, you&apos;re matched.</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_GAMES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGame(g)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${game === g ? "border-transparent bg-brand-gradient text-white" : "border-border bg-muted text-steel/80"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <p className="text-xs text-steel/50">Quick matches are for fun and bragging rights. No PlayCoins are paid.</p>
              {error && <p className="text-sm text-signal-red">{error}</p>}
              <Button size="lg" onClick={start}>Find an opponent</Button>
            </div>
          )}

          {stage === "searching" && (
            <div className="mt-4 flex flex-col items-center gap-4 py-4 text-center">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-violet/30" />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient text-white">
                  <Loader2 className="h-9 w-9 animate-spin" />
                </span>
              </div>
              <div>
                <p className="font-display text-lg font-bold">Looking for a {game} opponent…</p>
                <p className="text-sm text-steel/60">Waiting {mm}:{ss} · stay on this screen</p>
              </div>
              <Button variant="outline" onClick={cancel}><X className="h-4 w-4" /> Cancel</Button>
            </div>
          )}

          {stage === "expired" && (
            <div className="mt-4 flex flex-col items-center gap-3 py-4 text-center">
              <p className="font-display text-lg font-bold">No one yet</p>
              <p className="text-sm text-steel/60">Nobody tapped Play for {game} in the last 5 minutes. Tell a friend to jump in, then try again.</p>
              <Button onClick={() => setStage("pick")}>Try again</Button>
            </div>
          )}

          {stage === "matched" && (
            <MatchedView
              uid={profile.uid}
              challenge={challenge}
              onDone={() => {
                setOpen(false);
                setStage("pick");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function MatchedView({ uid, challenge, onDone }: { uid: string; challenge: Challenge | undefined; onDone: () => void }) {
  const otherUid = challenge ? (challenge.challengerId === uid ? challenge.opponentId : challenge.challengerId) : null;
  const [opp, setOpp] = useState<UserProfile | null>(null);
  useEffect(() => {
    if (!otherUid) return;
    getDoc(doc(db, "users", otherUid))
      .then((s) => {
        if (s.exists()) setOpp({ uid: s.id, ...s.data() } as UserProfile);
      })
      .catch(() => undefined);
  }, [otherUid]);

  if (!challenge) return <p className="mt-4 text-sm text-steel/60">Setting up your match…</p>;

  const other = challenge.challengerId === uid ? challenge.opponent : challenge.challenger;
  const def = gameForTournament(challenge.game);
  const theirId = opp && def ? connectedGames(opp).find((g) => g.def.key === def.key) : undefined;

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
        <Avatar className="h-14 w-14">
          <AvatarImage src={other.photoURL ?? undefined} alt={other.displayName} />
          <AvatarFallback>{other.displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{other.displayName}</p>
          <p className="truncate text-xs text-steel/60">@{other.username} · {challenge.game}</p>
          {theirId ? (
            <p className="truncate text-xs text-steel/70">
              Their {theirId.def.label} ID{theirId.platform ? ` (${theirId.platform})` : ""}: <span className="font-semibold text-foreground">{theirId.id}</span>
            </p>
          ) : (
            <p className="text-xs text-steel/50">No game ID added. Say hi in chat to sort it out.</p>
          )}
        </div>
      </div>
      <OpenGameButton game={challenge.game} />
      <div className="-mx-1 overflow-hidden rounded-2xl border border-border">
        <ChallengeRow c={challenge} uid={uid} />
      </div>
      <p className="text-xs text-steel/50">When you finish, tap I won or I lost. Your opponent confirms it.</p>
      <Button variant="outline" onClick={onDone}>Close</Button>
    </div>
  );
}
