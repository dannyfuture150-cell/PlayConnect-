"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminLeagues, useAdminTournaments, useAdminUsers } from "@/hooks/useAdmin";
import { useDeleteTournament } from "@/hooks/useTournaments";
import { useDeleteLeague } from "@/hooks/useLeagues";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminSetWinner } from "@/components/admin/AdminSetWinner";

type Tab = "tournaments" | "leagues";

export default function AdminCompetitionsPage() {
  const { data: tournaments, isLoading: tLoading } = useAdminTournaments();
  const { data: leagues, isLoading: lLoading } = useAdminLeagues();
  const { data: users } = useAdminUsers();
  const deleteTournament = useDeleteTournament();
  const deleteLeague = useDeleteLeague();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("tournaments");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (uid: string) => users?.find((u) => u.uid === uid)?.displayName ?? "Unknown";

  async function remove(kind: Tab, id: string) {
    setError(null);
    try {
      if (kind === "tournaments") await deleteTournament.mutateAsync(id);
      else await deleteLeague.mutateAsync(id);
      setConfirmingId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-leagues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch {
      setError("Couldn't delete — make sure the latest Firestore rules are published.");
    }
  }

  const busy = deleteTournament.isPending || deleteLeague.isPending;
  const loading = tab === "tournaments" ? tLoading : lLoading;

  function DeleteControl({ id }: { id: string }) {
    return confirmingId === id ? (
      <div className="flex gap-1.5">
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => remove(tab, id)}>
          {busy ? "Deleting…" : "Confirm"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirmingId(null)}>
          Cancel
        </Button>
      </div>
    ) : (
      <button
        onClick={() => setConfirmingId(id)}
        className="rounded-lg p-1.5 text-steel/40 hover:bg-signal-red/10 hover:text-signal-red"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Competitions</h1>
        <p className="text-sm text-steel/50">All tournaments and leagues. Deleting removes them for everyone.</p>
      </div>

      <div className="flex gap-1.5">
        {(["tournaments", "leagues"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setConfirmingId(null);
            }}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize ${
              tab === t ? "border-violet/50 bg-violet/10 text-violet-glow" : "border-border bg-card text-steel/60"
            }`}
          >
            {t} ({t === "tournaments" ? tournaments?.length ?? 0 : leagues?.length ?? 0})
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}
      {loading && <div className="h-24 animate-pulse rounded-2xl bg-muted" />}

      {tab === "tournaments" && (
        <div className="flex flex-col gap-2">
          {!tLoading && tournaments?.length === 0 && (
            <Card className="p-10 text-center text-sm text-steel/50">No tournaments yet.</Card>
          )}
          {tournaments?.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <Link href={`/tournaments/${t.id}`} target="_blank" className="truncate text-sm font-semibold text-foreground hover:underline">
                  {t.title}
                </Link>
                <p className="truncate text-xs text-steel/50">
                  {t.game} · by {nameOf(t.organizerId)} · {t.participantIds?.length ?? 0}/{t.maxParticipants} joined ·{" "}
                  {t.entryType === "stars" ? `PlayCoins (${t.starsFee ?? "?"} 🪙)` : t.entryType === "paid" ? `Paid${t.entryFee ? ` (${t.entryFee})` : ""}` : "Free"} · {t.status}
                </p>
              </div>
              <AdminSetWinner tournament={t} />
              <DeleteControl id={t.id} />
            </Card>
          ))}
        </div>
      )}

      {tab === "leagues" && (
        <div className="flex flex-col gap-2">
          {!lLoading && leagues?.length === 0 && <Card className="p-10 text-center text-sm text-steel/50">No leagues yet.</Card>}
          {leagues?.map((l) => (
            <Card key={l.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <Link href={`/leagues/${l.id}`} target="_blank" className="truncate text-sm font-semibold text-foreground hover:underline">
                  {l.name}
                </Link>
                <p className="truncate text-xs text-steel/50">
                  {l.game} · by {nameOf(l.creatorId)} · {l.teamsCount ?? 0}/{l.maxParticipants} joined ·{" "}
                  {l.started ? "Started" : "Not started"}
                </p>
              </div>
              <DeleteControl id={l.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
