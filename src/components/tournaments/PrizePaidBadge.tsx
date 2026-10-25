"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { doc, serverTimestamp, updateDoc, deleteField } from "firebase/firestore";
import { BadgeCheck } from "lucide-react";
import { db } from "@/lib/firebase/client";
import type { Tournament } from "@/types";
import { Button } from "@/components/ui/button";

/**
 * Trust signal: shows "Prize paid" on a finished tournament. The organiser
 * flips it on after paying; if the winner confirmed receipt, it says so.
 */
export function PrizePaidBadge({ tournament, isOrganizer }: { tournament: Tournament; isOrganizer: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tournament.prize || tournament.status !== "completed") return null;

  async function setPaid(paid: boolean) {
    setBusy(true);
    setError(null);
    try {
      await updateDoc(doc(db, "tournaments", tournament.id), {
        prizePaid: paid,
        prizePaidAt: paid ? serverTimestamp() : deleteField(),
      });
      queryClient.invalidateQueries({ queryKey: ["tournament", tournament.id] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    } catch {
      setError("Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (tournament.prizePaid) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <BadgeCheck className="h-4 w-4" />
          Prize paid{tournament.prizeConfirmed ? " · confirmed by the winner" : ""}
        </span>
        {isOrganizer && (
          <button type="button" disabled={busy} onClick={() => setPaid(false)} className="text-[11px] text-steel/50 underline">
            Undo
          </button>
        )}
      </div>
    );
  }

  if (isOrganizer) {
    return (
      <div className="mt-3">
        <Button size="sm" disabled={busy} onClick={() => setPaid(true)}>
          <BadgeCheck className="h-4 w-4" />
          {busy ? "Saving…" : "Mark prize as paid"}
        </Button>
        {error && <p className="mt-1 text-xs text-signal-red">{error}</p>}
      </div>
    );
  }
  return null;
}
