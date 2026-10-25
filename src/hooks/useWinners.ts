"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Tournament, UserProfile } from "@/types";

export interface WinnerEntry {
  tournament: Tournament;
  user: Pick<UserProfile, "uid" | "username" | "displayName" | "photoURL">;
}

/** Recent champions + this week's "Player of the week" (most wins in the last 7 days). */
export function useWinners(tournaments: Tournament[] | undefined) {
  const done = (tournaments ?? [])
    .filter((t) => t.status === "completed" && !!t.winnerId)
    .sort((a, b) => (b.startsAt?.toMillis?.() ?? 0) - (a.startsAt?.toMillis?.() ?? 0));
  const recent = done.slice(0, 6);
  const weekAgo = Date.now() - 7 * 24 * 3600_000;
  const wins = new Map<string, number>();
  done.filter((t) => (t.startsAt?.toMillis?.() ?? 0) > weekAgo).forEach((t) => wins.set(t.winnerId!, (wins.get(t.winnerId!) ?? 0) + 1));
  const top = Array.from(wins.entries()).sort((a, b) => b[1] - a[1])[0];
  const ids = Array.from(new Set([...recent.map((t) => t.winnerId!), ...(top ? [top[0]] : [])]));

  const users = useQuery({
    queryKey: ["winner-users", ids.join(",")],
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const out = new Map<string, WinnerEntry["user"]>();
      await Promise.all(
        ids.map(async (id) => {
          try {
            const s = await getDoc(doc(db, "users", id));
            if (s.exists()) {
              const d = s.data() as UserProfile;
              out.set(id, { uid: id, username: d.username, displayName: d.displayName, photoURL: d.photoURL ?? null });
            }
          } catch {
            // skip
          }
        })
      );
      return out;
    },
  });

  const map = users.data;
  const entries: WinnerEntry[] = map
    ? recent.flatMap((t) => {
        const u = map.get(t.winnerId!);
        return u ? [{ tournament: t, user: u }] : [];
      })
    : [];
  const potw = top && map?.get(top[0]) ? { user: map.get(top[0])!, wins: top[1] } : null;
  return { entries, potw };
}
