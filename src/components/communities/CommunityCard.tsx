"use client";

import Link from "next/link";
import Image from "next/image";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Community } from "@/types";
import { formatCount } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { unreadAnnouncements, useChatUnreadCounts } from "@/hooks/useCommunities";
import { Card } from "@/components/ui/card";

export function CommunityCard({ community }: { community: Community }) {
  const { profile } = useAuth();
  const isMember = !!profile && community.memberIds?.includes(profile.uid);
  const unread = isMember ? unreadAnnouncements(community, profile?.communitySeenCounts) : 0;
  const chatCounts = useChatUnreadCounts(profile?.uid, profile?.communityChatSeen);
  const chatUnread = isMember ? chatCounts[community.id] ?? 0 : 0;
  const total = unread + chatUnread;

  return (
    <Link href={`/communities/${community.slug}`}>
      <Card className="-mx-4 -mb-px rounded-none border-x-0 shadow-none md:mx-0 md:mb-0 md:rounded-2xl md:border-x flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-brand-gradient">
          {community.photoURL ? (
            <Image src={community.photoURL} alt={community.name} fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
              {community.name[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold text-foreground">{community.name}</p>
          <p className={`truncate text-xs ${total > 0 ? "font-medium text-foreground" : "text-steel/50"}`}>
            {isMember && community.lastAnnouncement ? community.lastAnnouncement : community.game}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isMember && community.lastAnnouncementAt ? (
            <span className={`text-[11px] ${total > 0 ? "font-semibold text-emerald-400" : "text-steel/40"}`}>
              {formatDistanceToNow(community.lastAnnouncementAt.toDate(), { addSuffix: false })}
            </span>
          ) : (
            <div className="flex items-center gap-1 text-xs text-steel/50">
              <Users className="h-3.5 w-3.5" />
              {formatCount(community.memberCount)}
            </div>
          )}
          {total > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
