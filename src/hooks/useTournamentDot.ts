"use client";

import { useEffect, useState } from "react";
import { useTournaments } from "@/hooks/useTournaments";
import { effectiveStatus } from "@/lib/tournamentStatus";

const KEY = "pc-tournaments-seen";
const EVENT = "pc-tournaments-seen-changed";

function readSeen(): number {
  try {
    return Number(localStorage.getItem(KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/** Call when the Tournaments page is opened: clears the dot on the tab. */
export function markTournamentsSeen() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT));
}

/** True while there is a tournament the person hasn't looked at yet. Powers the dot on the Tournaments tab. */
export function useNewTournamentsDot(uid: string | undefined): boolean {
  const { data } = useTournaments({ poll: true });
  const [seen, setSeen] = useState(0);

  useEffect(() => {
    setSeen(readSeen());
    const onChange = () => setSeen(readSeen());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  if (!uid || !data) return false;
  return data.some((t) => {
    if (effectiveStatus(t) === "completed" || t.organizerId === uid) return false;
    const created = t.createdAt?.toMillis?.() ?? Date.now();
    return created > seen;
  });
}
