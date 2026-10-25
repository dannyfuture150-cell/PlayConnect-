"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useCommunities } from "@/hooks/useCommunities";
import type { UserProfile } from "@/types";
import { formatCount } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FollowButton } from "@/components/profile/FollowButton";

function useSuggestedPlayers(excludeUid: string | undefined) {
  return useQuery<UserProfile[]>({
    queryKey: ["suggested-players", excludeUid],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(6)));
      return snap.docs
        .map((d) => d.data() as UserProfile)
        .filter((u) => u.uid !== excludeUid && u.onboardingComplete);
    },
  });
}

export function RightRail() {
  const { profile } = useAuth();
  const { data: players } = useSuggestedPlayers(profile?.uid);
  const { data: communities } = useCommunities();

  return (
    <aside className="sticky top-20 hidden w-80 shrink-0 flex-col gap-4 self-start lg:flex">
      <Card className="p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel/50">Suggested players</h3>
        <div className="flex flex-col gap-3">
          {players?.slice(0, 4).map((p) => (
            <div key={p.uid} className="flex items-center gap-2.5">
              <Link href={`/profile/${p.username}`} className="flex flex-1 items-center gap-2.5 overflow-hidden">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={p.photoURL ?? undefined} alt={p.displayName} />
                  <AvatarFallback>{p.displayName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium text-foreground">{p.displayName}</p>
                  <p className="truncate text-xs text-steel/50">{formatCount(p.followersCount)} followers</p>
                </div>
              </Link>
              <FollowButton targetUid={p.uid} />
            </div>
          ))}
          {(!players || players.length === 0) && <p className="text-xs text-steel/40">No suggestions yet.</p>}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel/50">Popular communities</h3>
        <div className="flex flex-col gap-3">
          {communities?.slice(0, 4).map((c) => (
            <Link key={c.id} href={`/communities/${c.slug}`} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-sm font-bold text-white">
                {c.name[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                <p className="truncate text-xs text-steel/50">{formatCount(c.memberCount)} members</p>
              </div>
            </Link>
          ))}
          {(!communities || communities.length === 0) && <p className="text-xs text-steel/40">No communities yet.</p>}
        </div>
        <Link href="/communities" className="mt-3 block text-center text-xs font-medium text-violet-glow hover:underline">
          See all
        </Link>
      </Card>

      <p className="px-2 text-center text-[11px] text-steel/30">© {new Date().getFullYear()} PlayConnect</p>
    </aside>
  );
}
