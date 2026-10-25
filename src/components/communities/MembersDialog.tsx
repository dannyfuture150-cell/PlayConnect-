"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, UserMinus, Users } from "lucide-react";
import type { Community } from "@/types";
import { useAuth } from "@/providers/AuthProvider";
import { useLiveAuthor } from "@/hooks/useProfile";
import { useRemoveCommunityMember, useSetCommunityAdmin } from "@/hooks/useCommunities";
import { formatCount } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function MemberRow({ community, uid, onNavigate }: { community: Community; uid: string; onNavigate: () => void }) {
  const { profile } = useAuth();
  const { data: u } = useLiveAuthor(uid);
  const setAdmin = useSetCommunityAdmin(community.id, community.slug);
  const remove = useRemoveCommunityMember(community.id, community.slug);

  const isCreator = uid === community.createdBy;
  const isAdminRole = community.moderatorIds?.includes(uid);
  const viewerIsCreator = profile?.uid === community.createdBy;
  const viewerIsAdmin = !!profile && community.moderatorIds?.includes(profile.uid);
  const [menu, setMenu] = useState(false);

  const canManage = !isCreator && uid !== profile?.uid && (viewerIsCreator || (viewerIsAdmin && !isAdminRole));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <Link href={u ? `/profile/${u.username}` : "#"} onClick={onNavigate} className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={u?.photoURL ?? undefined} alt="" />
            <AvatarFallback>{u?.displayName?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {u?.displayName ?? "Player"}
              {uid === profile?.uid && <span className="font-normal text-steel/50"> (You)</span>}
            </p>
            <p className="truncate text-xs text-steel/50">{u ? `@${u.username}` : ""}</p>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {isCreator ? (
            <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400">Group admin</span>
          ) : isAdminRole ? (
            <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400">Admin</span>
          ) : null}
          {canManage && (
            <button type="button" onClick={() => setMenu((m) => !m)} className="rounded-lg px-2 py-1 text-xs font-medium text-steel/60 hover:bg-muted">
              Manage
            </button>
          )}
        </div>
      </div>
      {menu && canManage && (
        <div className="ml-[52px] flex flex-wrap gap-2">
          {viewerIsCreator && (
            <button
              type="button"
              disabled={setAdmin.isPending}
              onClick={() => setAdmin.mutate({ uid, makeAdmin: !isAdminRole }, { onSuccess: () => setMenu(false) })}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> {isAdminRole ? "Remove as admin" : "Make admin"}
            </button>
          )}
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => {
              if (isAdminRole) return;
              remove.mutate(uid, { onSuccess: () => setMenu(false) });
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-signal-red disabled:opacity-40"
            title={isAdminRole ? "Remove their admin role first" : "Remove from group"}
          >
            <UserMinus className="h-3.5 w-3.5" /> Remove from group
          </button>
          {(setAdmin.isError || remove.isError) && (
            <p className="w-full text-[11px] text-signal-red">Couldn&apos;t do that — publish the latest Firestore rules.</p>
          )}
        </div>
      )}
    </div>
  );
}

/** WhatsApp-style member list: opens on tap, everyone can see it, the creator is "Group admin". */
export function MembersDialog({ community }: { community: Community }) {
  const [open, setOpen] = useState(false);
  const ids = community.memberIds ?? [];
  const sorted = [...ids].sort((a, b) => {
    const rank = (id: string) => (id === community.createdBy ? 0 : community.moderatorIds?.includes(id) ? 1 : 2);
    return rank(a) - rank(b);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="mt-1 flex items-center gap-1.5 text-xs font-medium text-violet-glow hover:underline">
          <Users className="h-3 w-3" /> {formatCount(community.memberCount)} members · View
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogTitle>{formatCount(community.memberCount)} members</DialogTitle>
        <div className="mt-4 flex flex-col gap-4">
          {sorted.map((id) => (
            <MemberRow key={id} community={community} uid={id} onNavigate={() => setOpen(false)} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
