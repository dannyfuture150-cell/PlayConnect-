"use client";

import { CompeteSwitch } from "@/components/shared/CompeteSwitch";
import Link from "next/link";
import { Layers } from "lucide-react";
import { useLeagues } from "@/hooks/useLeagues";
import { useAuth } from "@/providers/AuthProvider";
import { LeagueCard } from "@/components/leagues/LeagueCard";
import { CreateLeagueDialog } from "@/components/leagues/CreateLeagueDialog";

export default function LeaguesPage() {
  const { data: leagues, isLoading } = useLeagues();
  const { profile } = useAuth();
  const isOrganizer = profile?.accountType === "organizer";

  return (
    <div className="flex flex-col gap-5">
      <CompeteSwitch />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Leagues</h1>
          <p className="text-sm text-steel/50">League: everyone plays everyone, and the most points wins. Join one or create your own.</p>
        </div>
        {isOrganizer ? (
          <CreateLeagueDialog />
        ) : (
          <Link href="/settings" className="text-xs font-medium text-violet-glow hover:underline">
            Switch to Organiser
          </Link>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && (!leagues || leagues.length === 0) && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Layers className="mx-auto h-8 w-8 text-steel/30" />
          <p className="mt-3 text-sm text-steel/50">No leagues yet — create the first one.</p>
        </div>
      )}

      <div className="flex flex-col md:gap-3">
        {leagues?.map((l) => (
          <LeagueCard key={l.id} league={l} />
        ))}
      </div>
    </div>
  );
}
