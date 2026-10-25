"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Community, League, Tournament, UserProfile } from "@/types";

export interface SearchResults {
  users: UserProfile[];
  tournaments: Tournament[];
  communities: Community[];
  leagues: League[];
}

function matches(text: string | undefined, q: string): boolean {
  return !!text && text.toLowerCase().includes(q);
}

/**
 * Firestore has no native full-text search, and at this app's scale a
 * separate search service (Algolia etc.) would be overkill — so this pulls
 * a reasonably-sized recent/popular slice of each collection and filters
 * client-side by substring match. Same tradeoff already used for Explore's
 * suggested players and the leaderboard.
 */
export function useSearch(searchText: string) {
  const q = searchText.trim().toLowerCase();

  // The candidate pool is fetched ONCE (and cached for 5 minutes); typing
  // only re-filters it in memory. Previously every keystroke re-downloaded
  // ~500 documents, which is what made search feel slow.
  const pool = useQuery({
    queryKey: ["search-pool"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [usersSnap, tournamentsSnap, communitiesSnap, leaguesSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), orderBy("followersCount", "desc"), limit(200))),
        getDocs(query(collection(db, "tournaments"), orderBy("startsAt", "desc"), limit(100))),
        getDocs(query(collection(db, "communities"), orderBy("memberCount", "desc"), limit(100))),
        getDocs(query(collection(db, "leagues"), orderBy("createdAt", "desc"), limit(100))),
      ]);
      return {
        users: usersSnap.docs.map((d) => d.data() as UserProfile),
        tournaments: tournamentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament)),
        communities: communitiesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Community)),
        leagues: leaguesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as League)),
      };
    },
    enabled: q.length >= 2,
  });

  const data = useMemo<SearchResults | undefined>(() => {
    if (!pool.data || q.length < 2) return undefined;
    return {
      users: pool.data.users
        .filter((u) => u.onboardingComplete && (matches(u.username, q) || matches(u.displayName, q)))
        .slice(0, 20),
      tournaments: pool.data.tournaments.filter((t) => matches(t.title, q) || matches(t.game, q)).slice(0, 20),
      communities: pool.data.communities.filter((c) => matches(c.name, q) || matches(c.game, q)).slice(0, 20),
      leagues: pool.data.leagues.filter((l) => matches(l.name, q) || matches(l.game, q)).slice(0, 20),
    };
  }, [pool.data, q]);

  return { data, isLoading: pool.isLoading };
}
