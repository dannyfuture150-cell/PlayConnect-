"use client";

import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/** How many prizes this organiser has marked as paid — their public track record. */
export function useOrganizerPaidCount(uid: string | undefined, enabled: boolean) {
  return useQuery<number>({
    queryKey: ["organizer-paid", uid],
    enabled: !!uid && enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, "tournaments"), where("organizerId", "==", uid as string), where("prizePaid", "==", true), limit(100))
      );
      return snap.size;
    },
  });
}
