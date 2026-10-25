"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, CheckCircle2, Search, Trash2 } from "lucide-react";
import { useAdminUsers, useDeleteUserAccount, useSetAccountType, useSetUserBanned } from "@/hooks/useAdmin";
import type { UserProfile } from "@/types";
import { AdminUserTools } from "@/components/admin/AdminUserTools";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatCount } from "@/lib/utils";

type StatusFilter = "all" | "active" | "banned";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAdminUsers();
  const setBanned = useSetUserBanned();
  const deleteAccount = useDeleteUserAccount();
  const setAccountType = useSetAccountType();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [confirmingDeleteUid, setConfirmingDeleteUid] = useState<string | null>(null);
  const [toolsUid, setToolsUid] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = (users ?? []).filter((u) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || u.username?.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q);
    const matchesStatus = status === "all" || (status === "banned" ? !!u.isBanned : !u.isBanned);
    return matchesSearch && matchesStatus;
  });

  async function handleToggleBan(u: UserProfile) {
    setActionError(null);
    try {
      await setBanned.mutateAsync({ uid: u.uid, banned: !u.isBanned });
    } catch {
      setActionError("Permission denied — check that Firestore rules have been re-published in Firebase Console.");
    }
  }

  async function handleToggleType(u: UserProfile) {
    setActionError(null);
    try {
      await setAccountType.mutateAsync({ uid: u.uid, accountType: u.accountType === "organizer" ? "player" : "organizer" });
    } catch {
      setActionError("Permission denied — check that Firestore rules have been re-published in Firebase Console.");
    }
  }

  async function handleDelete(u: UserProfile) {
    setActionError(null);
    try {
      await deleteAccount.mutateAsync({ uid: u.uid, username: u.username });
      setConfirmingDeleteUid(null);
    } catch {
      setActionError("Permission denied — check that Firestore rules have been re-published in Firebase Console.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-steel/50">{users?.length ?? 0} accounts total.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel/40" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or username…" className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "active", "banned"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                status === s ? "border-violet/50 bg-violet/10 text-violet-glow" : "border-border bg-card text-steel/60 hover:text-steel"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {actionError && <p className="text-sm text-signal-red">{actionError}</p>}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-sm text-steel/50">No users match that search.</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((u) => (
          <Card key={u.uid} className="flex flex-wrap items-center gap-3 p-3.5">
            <Link href={`/profile/${u.username}`} target="_blank">
              <Avatar className="h-10 w-10">
                <AvatarImage src={u.photoURL ?? undefined} alt={u.displayName} />
                <AvatarFallback>{u.displayName?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${u.username}`} target="_blank" className="truncate text-sm font-semibold text-foreground hover:underline">
                  {u.displayName}
                </Link>
                {u.isBanned && (
                  <span className="shrink-0 rounded-full border border-signal-red/30 bg-signal-red/10 px-2 py-0.5 text-[10px] font-semibold text-signal-red">
                    Banned
                  </span>
                )}
                {u.accountType === "organizer" && (
                  <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-steel/60">
                    Organiser
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-steel/50">
                @{u.username} · {formatCount(u.followersCount ?? 0)} followers · {formatCount(u.postsCount ?? 0)} posts
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setToolsUid(toolsUid === u.uid ? null : u.uid)}>
                Rank &amp; badges
              </Button>
              <Button size="sm" variant="outline" disabled={setAccountType.isPending} onClick={() => handleToggleType(u)}>
                {u.accountType === "organizer" ? "Make player" : "Make organiser"}
              </Button>
              <Button
                size="sm"
                variant={u.isBanned ? "outline" : "destructive"}
                disabled={setBanned.isPending}
                onClick={() => handleToggleBan(u)}
              >
                {u.isBanned ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Unban
                  </>
                ) : (
                  <>
                    <Ban className="h-3.5 w-3.5" /> Ban
                  </>
                )}
              </Button>

              {confirmingDeleteUid === u.uid ? (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="destructive" disabled={deleteAccount.isPending} onClick={() => handleDelete(u)}>
                    {deleteAccount.isPending ? "Deleting…" : "Confirm"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmingDeleteUid(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingDeleteUid(u.uid)}
                  className="rounded-lg p-2 text-steel/40 hover:bg-signal-red/10 hover:text-signal-red"
                  title="Delete account"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {toolsUid === u.uid && <AdminUserTools user={u} />}
          </Card>
        ))}
      </div>
    </div>
  );
}
