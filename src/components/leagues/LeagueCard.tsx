import Link from "next/link";
import { Layers, Gamepad2 } from "lucide-react";
import type { League } from "@/types";
import { Card } from "@/components/ui/card";

export function LeagueCard({ league }: { league: League }) {
  return (
    <Link href={`/leagues/${league.id}`}>
      <Card className="-mx-4 -mb-px flex items-center gap-3 rounded-none border-x-0 px-4 py-3.5 shadow-none transition-colors hover:bg-muted md:mx-0 md:mb-0 md:rounded-2xl md:border-x md:p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
          <Layers className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-display text-sm font-semibold text-foreground">{league.name}</p>
            {league.entryType === "paid" && (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                Paid
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-steel/50">
            <Gamepad2 className="h-3 w-3" /> {league.game}
          </p>
        </div>
        <div className="text-right text-xs text-steel/50">
          <p>{league.teamsCount}/{league.maxParticipants} joined</p>
          <p>{league.started ? `Closed · ${league.matchesCount} matches` : "Open to join"}</p>
        </div>
      </Card>
    </Link>
  );
}
