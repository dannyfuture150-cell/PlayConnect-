"use client";

import { useState } from "react";
import Link from "next/link";
import { Linkify } from "@/components/shared/Linkify";
import { MediaLightbox } from "@/components/shared/MediaLightbox";
import { Megaphone, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { CommunityAnnouncement } from "@/types";
import { useDeleteAnnouncement } from "@/hooks/useCommunityAnnouncements";
import { AnnouncementReactions } from "@/components/communities/AnnouncementReactions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function AnnouncementList({
  announcements,
  loading,
  communityId,
  isModerator,
  isMember = false,
}: {
  announcements: CommunityAnnouncement[];
  loading: boolean;
  communityId: string;
  isModerator: boolean;
  isMember?: boolean;
}) {
  const deleteAnnouncement = useDeleteAnnouncement(communityId);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <Megaphone className="mx-auto h-6 w-6 text-steel/30" />
        <p className="mt-2 text-sm text-steel/50">No announcements yet.</p>
      </div>
    );
  }

  async function handleDelete(id: string) {
    await deleteAnnouncement.mutateAsync(id);
    setConfirmingId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {announcements.map((a) => (
        <Card key={a.id} className="overflow-hidden">
          <div className="flex items-start gap-2.5 p-4 pb-2">
            <Link href={`/profile/${a.author.username}`} className="flex flex-1 items-start gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={a.author.photoURL ?? undefined} alt={a.author.displayName} />
                <AvatarFallback>{a.author.displayName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{a.author.displayName}</p>
                <p className="text-xs text-steel/40">
                  {a.createdAt ? formatDistanceToNow(a.createdAt.toDate(), { addSuffix: true }) : "just now"}
                </p>
              </div>
            </Link>

            {isModerator && (
              confirmingId === a.id ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deleteAnnouncement.isPending}
                    onClick={() => handleDelete(a.id)}
                  >
                    {deleteAnnouncement.isPending ? "Deleting…" : "Yes"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmingId(null)}>
                    No
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(a.id)}
                  className="shrink-0 rounded-lg p-1.5 text-steel/40 hover:bg-signal-red/10 hover:text-signal-red"
                  title="Delete announcement"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
          <p className="whitespace-pre-wrap px-4 pb-3 text-sm leading-relaxed text-steel/80"><Linkify text={a.text} /></p>
          {a.imageUrl && (
            <button type="button" onClick={() => setViewerUrl(a.imageUrl)} className="block w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.imageUrl} alt="" loading="lazy" className="mx-auto block max-h-96 w-full object-contain" />
            </button>
          )}
          <AnnouncementReactions communityId={communityId} announcementId={a.id} isMember={isMember} />
        </Card>
      ))}
      {viewerUrl && <MediaLightbox url={viewerUrl} type="image" onClose={() => setViewerUrl(null)} />}
    </div>
  );
}
