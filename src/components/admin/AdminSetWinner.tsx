"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { useAdminSetWinner, useAdminUsers } from "@/hooks/useAdmin";
import type { Tournament, UserProfile } from "@/types";
import { Button } from "@/components/ui/button";

/** Admin-only: pick one of the tournament's players and make them the winner. */
export function AdminSetWinner({ tournament }: { tournament: Tournament }) {
  const { data: users } = useAdminUsers();
  const setWinner = useAdminSetWinner();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const players = (tournament.participantIds ?? [])
    .map((id) => users?.find((u) => u.uid === id))
    .filter((u): u is UserProfile => !!u);
  const nameOf = (uid?: string) => users?.find((u) => u.uid === uid)?.displayName ?? "Unknown";

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Crown className="h-3.5 w-3.5" /> {tournament.winnerId ? "Change winner" : "Make winner"}
      </Button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-xs text-steel/60">
        Pick the winner of <span className="font-semibold text-foreground">{tournament.title}</span>. The tournament is marked
        completed, they get +1 win, the Champion badge and the trophy popup.
        {tournament.winnerId && <> Current winner: <span className="font-semibold">{nameOf(tournament.winnerId)}</span> (their win is taken back).</>}
      </p>
      <select
        value={pick}
        onChange={(e) => setPick(e.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
      >
        <option value="">Choose a player…</option>
        {players.map((p) => (
          <option key={p.uid} value={p.uid}>
            {p.displayName} (@{p.username})
          </option>
        ))}
      </select>
      {(tournament.participantIds ?? []).length === 0 && <p className="mt-1 text-xs text-signal-red">No players joined this tournament.</p>}
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          disabled={!pick || setWinner.isPending}
          onClick={async () => {
            setMsg(null);
            try {
              await setWinner.mutateAsync({ tournament, winnerUid: pick });
              setMsg("Done — winner set.");
              setOpen(false);
            } catch (e) {
              setMsg((e as Error).message?.includes("permission") ? "Permission denied — check the admin account." : (e as Error).message || "Couldn't set the winner.");
            }
          }}
        >
          {setWinner.isPending ? "Saving…" : "Confirm winner"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {msg && <p className="mt-2 text-xs text-signal-red">{msg}</p>}
    </div>
  );
}
