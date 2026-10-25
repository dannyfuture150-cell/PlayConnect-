"use client";

import { VerifiedTick } from "@/components/shared/VerifiedBadge";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useLiveAuthor } from "@/hooks/useProfile";
import { useAuth } from "@/providers/AuthProvider";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FollowButton } from "@/components/profile/FollowButton";

function Row({ uid, onNavigate }: { uid: string; onNavigate: () => void }) {
  const { data: u } = useLiveAuthor(uid);
  const { profile } = useAuth();
  if (!u) return <div className="h-12 animate-pulse rounded-xl bg-muted" />;
  return (
    <div className="flex items-center justify-between gap-3">
      <Link href={`/profile/${u.username}`} onClick={onNavigate} className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={u.photoURL ?? undefined} alt={u.displayName} />
          <AvatarFallback>{u.displayName?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="flex items-center truncate text-sm font-semibold text-foreground">{u.displayName}<VerifiedTick uid={u.uid} /></p>
          <p className="truncate text-xs text-steel/50">@{u.username}</p>
        </div>
      </Link>
      {profile && profile.uid !== uid && <FollowButton targetUid={uid} />}
    </div>
  );
}

/** Wraps any trigger (the followers / following count) and opens a list of those people. */
export function FollowListDialog({ uid, kind, children }: { uid: string; kind: "followers" | "following"; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery<string[]>({
    queryKey: ["follow-list", kind, uid],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, kind, uid, "list"), limit(300)));
      return snap.docs.map((d) => d.id);
    },
    enabled: open,
    staleTime: 15 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogTitle>{kind === "followers" ? "Followers" : "Following"}</DialogTitle>
        <div className="mt-4 flex flex-col gap-3">
          {isLoading && <div className="h-12 animate-pulse rounded-xl bg-muted" />}
          {data?.length === 0 && (
            <p className="py-6 text-center text-sm text-steel/50">
              {kind === "followers" ? "No followers yet." : "Not following anyone yet."}
            </p>
          )}
          {data?.map((id) => <Row key={id} uid={id} onNavigate={() => setOpen(false)} />)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
