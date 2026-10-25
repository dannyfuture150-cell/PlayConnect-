"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { useLiveNow } from "@/hooks/useLive";
import { GoLiveDialog } from "@/components/live/GoLiveDialog";
import { PLATFORM_LABEL } from "@/lib/liveEmbed";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function LivePage() {
  const lives = useLiveNow();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-foreground">Live</h1>
        <GoLiveDialog />
      </div>

      {lives.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Radio className="mx-auto h-8 w-8 text-steel/30" />
          <p className="mt-3 text-sm text-steel/50">Nobody is live right now — be the first to go live.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lives.map((l) => (
            <Link key={l.id} href={`/live/${l.id}`}>
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted">
                <Avatar className="ring-2 ring-signal-red">
                  <AvatarImage src={l.host.photoURL ?? undefined} alt={l.host.displayName} />
                  <AvatarFallback>{l.host.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold text-foreground">{l.title}</p>
                  <p className="truncate text-xs text-steel/50">
                    {l.host.displayName}
                    {l.game ? ` · ${l.game}` : ""} · {PLATFORM_LABEL[l.platform]}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-signal-red px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
