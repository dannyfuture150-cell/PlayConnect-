"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { Copy, Gamepad2, Check } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { Card } from "@/components/ui/card";
import { connectedGames, gameForTournament } from "@/lib/gameAccounts";
import type { UserProfile } from "@/types";

/**
 * Lists the in-game names of the players in a tournament so the organiser (and the players
 * themselves) can add each other. Only loads when opened, to keep database reads low.
 */
export function PlayerGameIds({ participantIds, game, viewerUid, organizerId }: {
  participantIds: string[];
  game?: string;
  viewerUid?: string;
  organizerId: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const allowed = !!viewerUid && (viewerUid === organizerId || participantIds.includes(viewerUid));
  const def = gameForTournament(game);

  const { data, isLoading } = useQuery<UserProfile[]>({
    queryKey: ["player-game-ids", participantIds.join(",")],
    enabled: open && allowed && participantIds.length > 0,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const snaps = await Promise.all(participantIds.slice(0, 64).map((uid) => getDoc(doc(db, "users", uid))));
      return snaps.filter((s) => s.exists()).map((s) => ({ uid: s.id, ...s.data() } as UserProfile));
    },
  });

  if (!allowed || participantIds.length === 0) return null;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard may be blocked; the name is still on screen to read */
    }
  }

  return (
    <Card className="p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
        <Gamepad2 className="h-4 w-4 text-steel/60" />
        <span className="flex-1 text-sm font-semibold">Players&apos; game IDs{def ? ` (${def.label})` : ""}</span>
        <span className="text-xs text-steel/50">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {isLoading && <p className="text-xs text-steel/50">Loading…</p>}
          {(data ?? []).map((p) => {
            const games = connectedGames(p);
            const shown = def ? games.filter((g) => g.def.key === def.key) : games;
            return (
              <div key={p.uid} className="rounded-lg bg-muted px-3 py-2">
                <p className="text-sm font-semibold">{p.displayName} <span className="font-normal text-steel/50">@{p.username}</span></p>
                {shown.length === 0 ? (
                  <p className="text-xs text-steel/50">No {def ? def.label : "game"} ID added yet. Message them to ask.</p>
                ) : (
                  shown.map((g) => (
                    <div key={g.def.key} className="mt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="text-steel/60">
                        {g.def.label}{g.platform ? ` · ${g.platform}` : ""}: <span className="font-semibold text-foreground">{g.id}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copy(g.id)}
                        className="rounded-md p-1 text-steel/60 hover:text-foreground"
                        aria-label="Copy ID"
                      >
                        {copied === g.id ? <Check className="h-3.5 w-3.5 text-signal-green" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
