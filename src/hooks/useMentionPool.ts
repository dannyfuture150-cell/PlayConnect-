"use client";

import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface MentionCandidate {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string | null;
}

/** Players you can tag. Loaded once and cached; typing only filters it in memory. */
export function useMentionPool(enabled: boolean) {
  return useQuery<MentionCandidate[]>({
    queryKey: ["mention-pool"],
    staleTime: 10 * 60_000,
    enabled,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "users"), orderBy("followersCount", "desc"), limit(300)));
      return snap.docs
        .map((d) => d.data())
        .filter((u) => u.onboardingComplete && u.username)
        .map((u) => ({ uid: u.uid, username: u.username, displayName: u.displayName ?? u.username, photoURL: u.photoURL ?? null }));
    },
  });
}
