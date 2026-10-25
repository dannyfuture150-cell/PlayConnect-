"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { unreadAnnouncements } from "@/hooks/useCommunities";
import { useCommunities } from "@/hooks/useCommunities";
import { CommunityCard } from "@/components/communities/CommunityCard";
import { CreateCommunityDialog } from "@/components/communities/CreateCommunityDialog";

export default function CommunitiesPage() {
  const { data: communities, isLoading } = useCommunities();
  const { profile } = useAuth();

  // Groups you've joined come first (unread ones on top, like WhatsApp),
  // everything else goes under "Discover".
  const { mine, others } = useMemo(() => {
    const list = communities ?? [];
    const mine = list
      .filter((c) => !!profile && c.memberIds?.includes(profile.uid))
      .sort((a, b) => {
        const ua = unreadAnnouncements(a, profile?.communitySeenCounts) > 0 ? 1 : 0;
        const ub = unreadAnnouncements(b, profile?.communitySeenCounts) > 0 ? 1 : 0;
        if (ua !== ub) return ub - ua;
        return (b.lastAnnouncementAt?.toMillis?.() ?? 0) - (a.lastAnnouncementAt?.toMillis?.() ?? 0);
      });
    const others = list.filter((c) => !mine.includes(c));
    return { mine, others };
  }, [communities, profile]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-foreground">Communities</h1>
        <CreateCommunityDialog />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && (!communities || communities.length === 0) && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-steel/30" />
          <p className="mt-3 text-sm text-steel/50">No communities yet — be the first to start one.</p>
        </div>
      )}

      {mine.length > 0 && (
        <section className="flex flex-col md:gap-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel/50 md:mb-0">Your groups</h2>
          {mine.map((c) => (
            <CommunityCard key={c.id} community={c} />
          ))}
        </section>
      )}

      {others.length > 0 && (
        <section className="flex flex-col md:gap-3">
          {mine.length > 0 && <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-steel/50 md:mb-0">Discover</h2>}
          {others.map((c) => (
            <CommunityCard key={c.id} community={c} />
          ))}
        </section>
      )}
    </div>
  );
}
