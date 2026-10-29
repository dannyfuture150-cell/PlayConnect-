"use client";

import { Gamepad2 } from "lucide-react";
import { launchUrl, gameForTournament } from "@/lib/gameAccounts";

/** One tap to open the game on the player's phone (or its store page if it isn't installed). */
export function OpenGameButton({ game }: { game?: string }) {
  const def = gameForTournament(game);
  if (!def) return null;
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const url = launchUrl(def, ua);

  if (!url) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-xs text-steel/60">
        <Gamepad2 className="h-4 w-4" /> Open {def.label} on your console or PC to play.
      </p>
    );
  }
  return (
    <a
      href={url}
      className="flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-4 py-3 text-sm font-bold text-white"
    >
      <Gamepad2 className="h-4 w-4" /> Open {def.label}
    </a>
  );
}
