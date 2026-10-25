"use client";

import { useState } from "react";
import type { LeagueMatch, LeagueResult, LeagueTeam } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useReviewLeagueResult } from "@/hooks/useLeagueResults";
import { Button } from "@/components/ui/button";
import { MediaLightbox } from "@/components/shared/MediaLightbox";

export function LeaguePendingResults({ leagueId, results, matches, teams }: { leagueId: string; results: LeagueResult[]; matches: LeagueMatch[]; teams: LeagueTeam[] }) {
  const { profile } = useAuth();
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const review = useReviewLeagueResult(
    leagueId, teams,
    profile ? { uid: profile.uid, username: profile.username, displayName: profile.displayName, photoURL: profile.photoURL ?? null } : null
  );
  const byId = new Map(matches.map((m) => [m.id, m]));
  const pending = results.filter((r) => r.status === "pending" && byId.get(r.matchId) && !byId.get(r.matchId)!.played);
  if (pending.length === 0) return null;
  const counts = new Map<string, number>();
  pending.forEach((r) => counts.set(r.matchId, (counts.get(r.matchId) ?? 0) + 1));

  return (
    <div className="rounded-2xl border border-violet/30 bg-violet/5 p-4">
      <h3 className="text-sm font-bold text-foreground">Results waiting for you ({pending.length})</h3>
      <div className="mt-3 flex flex-col gap-3">
        {pending.map((r) => {
          const m = byId.get(r.matchId)!;
          return (
            <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <p className="text-sm font-semibold text-foreground">
                {m.homeTeamName} <span className="text-violet-glow">{r.homeScore}</span> – <span className="text-violet-glow">{r.awayScore}</span> {m.awayTeamName}
              </p>
              <p className="text-[11px] text-steel/60">Sent by {r.submitter?.displayName}{(counts.get(r.matchId) ?? 0) > 1 ? " · ⚠ both players sent results — compare the screenshots" : ""}</p>
              <button type="button" onClick={() => setViewerUrl(r.imageUrl)} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.imageUrl} alt="Result screenshot" className="max-h-56 w-full rounded-lg bg-black object-contain" />
                <span className="mt-1 block text-[11px] text-steel/50">Tap to view full size</span>
              </button>
              <div className="flex gap-2">
                <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ result: r, approve: true })}>Approve</Button>
                <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ result: r, approve: false })}>Reject</Button>
              </div>
            </div>
          );
        })}
      </div>
      {review.isError && <p className="mt-2 text-xs text-signal-red">{(review.error as Error)?.message || "Something went wrong."}</p>}
      {viewerUrl && <MediaLightbox url={viewerUrl} type="image" onClose={() => setViewerUrl(null)} />}
    </div>
  );
}
