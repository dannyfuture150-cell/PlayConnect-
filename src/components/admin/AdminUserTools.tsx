"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAdminBadge, useAdminSetRank } from "@/hooks/useAdmin";
import { ALL_RANKS } from "@/lib/rank";
import type { SkillLevel, UserProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESETS = ["⭐ Verified", "🏆 Tournament Champion", "🔥 Hot Streak", "👑 Legend", "🛡️ Trusted Organiser", "🎮 Founding Player"];

/** Admin-only panel: change a player's rank and give or take away badges. */
export function AdminUserTools({ user }: { user: UserProfile }) {
  const badge = useAdminBadge();
  const setRank = useAdminSetRank();
  const [custom, setCustom] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function run(p: Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await p;
      setMsg(ok);
    } catch (e) {
      setMsg((e as Error).message?.includes("permission") ? "Permission denied — check the admin account." : (e as Error).message || "Couldn't save.");
    }
  }

  const current = user.rankOverride ?? "auto";

  return (
    <div className="mt-3 w-full rounded-xl border border-border bg-muted/40 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel/50">Rank</p>
      <div className="flex flex-wrap gap-1.5">
        {(["auto", ...ALL_RANKS] as const).map((r) => (
          <button
            key={r}
            disabled={setRank.isPending}
            onClick={() => run(setRank.mutateAsync({ uid: user.uid, rank: r === "auto" ? null : (r as SkillLevel) }), r === "auto" ? "Rank is automatic again." : `Rank set to ${r}.`)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              current === r ? "border-violet/50 bg-violet/10 text-violet-glow" : "border-border bg-card text-steel/60"
            }`}
          >
            {r === "auto" ? "Automatic" : r}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-steel/50">Badges</p>
      <div className="flex flex-wrap gap-1.5">
        {(user.badges ?? []).length === 0 && <span className="text-xs text-steel/40">No badges yet.</span>}
        {(user.badges ?? []).map((b) => (
          <span key={b} className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground">
            {b}
            <button
              title="Remove badge"
              disabled={badge.isPending}
              onClick={() => run(badge.mutateAsync({ uid: user.uid, badge: b, remove: true }), "Badge removed.")}
              className="text-steel/40 hover:text-signal-red"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.filter((b) => !(user.badges ?? []).includes(b)).map((b) => (
          <button
            key={b}
            disabled={badge.isPending}
            onClick={() => run(badge.mutateAsync({ uid: user.uid, badge: b }), "Badge given.")}
            className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-steel/60 hover:border-violet/50 hover:text-violet-glow"
          >
            + {b}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={40} placeholder="Custom badge, e.g. 🥇 Season 1 Winner" />
        <Button
          size="sm"
          disabled={badge.isPending || !custom.trim()}
          onClick={async () => {
            await run(badge.mutateAsync({ uid: user.uid, badge: custom }), "Badge given.");
            setCustom("");
          }}
        >
          Give
        </Button>
      </div>
      {msg && <p className="mt-2 text-xs text-steel/60">{msg}</p>}
    </div>
  );
}
