"use client";

import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Post, UserProfile } from "@/types";

export function useTrendingPosts() {
  return useQuery<Post[]>({
    queryKey: ["trending-posts"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "posts"), orderBy("likesCount", "desc"), limit(5)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
    },
    staleTime: 5 * 60_000,
  });
}

export function useSuggestedPlayers(excludeUid: string | undefined) {
  return useQuery<UserProfile[]>({
    queryKey: ["suggested-players", excludeUid],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(12)));
      return snap.docs.map((d) => d.data() as UserProfile).filter((u) => u.uid !== excludeUid && u.onboardingComplete);
    },
    staleTime: 5 * 60_000,
  });
}
