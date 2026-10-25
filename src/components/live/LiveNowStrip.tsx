"use client";

import { LiveDot } from "@/components/shared/LiveDot";
import Link from "next/link";
import { useLiveNow } from "@/hooks/useLive";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/** Compact "Live now" row for the top of the feed. Renders nothing when nobody is live. */
export function LiveNowStrip() {
  const lives = useLiveNow();
  if (lives.length === 0) return null;
  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-steel/60">
          <LiveDot /> Live now
        </h2>
        <Link href="/live" className="text-xs font-medium text-violet-glow hover:underline">
          See all
        </Link>
      </div>
      <div className="flex w-full max-w-full min-w-0 gap-3 overflow-x-auto pb-1 scrollbar-none">
        {lives.map((l) => (
          <Link
            key={l.id}
            href={`/live/${l.id}`}
            className="flex w-56 shrink-0 items-center gap-3 rounded-2xl border border-signal-red/40 bg-card p-3 transition-colors hover:bg-muted"
          >
            <Avatar className="ring-2 ring-signal-red">
              <AvatarImage src={l.host.photoURL ?? undefined} alt={l.host.displayName} />
              <AvatarFallback>{l.host.displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{l.title}</p>
              <p className="truncate text-xs text-steel/50">
                {l.host.displayName}
                {l.game ? ` · ${l.game}` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
