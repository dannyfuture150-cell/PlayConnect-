"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Camera, Gamepad2, Info, ShieldCheck, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatCount } from "@/lib/utils";
import { useSwipe } from "@/hooks/useSwipe";
import {
  useCommunity,
  useDeleteCommunity,
  useToggleJoinCommunity,
  useUpdateCommunityImage,
  markCommunitySeen,
  unreadAnnouncements,
  useChatUnreadCounts,
} from "@/hooks/useCommunities";
import { useCommunityAnnouncements } from "@/hooks/useCommunityAnnouncements";
import { useAuth } from "@/providers/AuthProvider";
import { uploadImage, safeName, validateImageFile } from "@/lib/firebase/storage-helpers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditCommunityDialog } from "@/components/communities/EditCommunityDialog";
import { AnnouncementComposer } from "@/components/communities/AnnouncementComposer";
import { MembersDialog } from "@/components/communities/MembersDialog";
import { GroupChat } from "@/components/communities/GroupChat";
import { AnnouncementList } from "@/components/communities/AnnouncementList";

export default function CommunityDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { data: community, isLoading } = useCommunity(params.slug);
  const { profile } = useAuth();
  const chatCounts = useChatUnreadCounts(profile?.uid, profile?.communityChatSeen);
  const toggleJoin = useToggleJoinCommunity(community?.id ?? "", params.slug);
  const deleteCommunity = useDeleteCommunity();
  const updateImage = useUpdateCommunityImage(community?.id ?? "", params.slug);
  const { announcements, loading: announcementsLoading } = useCommunityAnnouncements(community?.id ?? "");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const TAB_ORDER = ["chat", "announcements", "about"] as const;
  const activeTabRef = useRef<(typeof TAB_ORDER)[number]>("chat");
  const swipe = useSwipe(
    () => { const i = TAB_ORDER.indexOf(activeTabRef.current); if (i < TAB_ORDER.length - 1) setTab(TAB_ORDER[i + 1]); },
    () => { const i = TAB_ORDER.indexOf(activeTabRef.current); if (i > 0) setTab(TAB_ORDER[i - 1]); }
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "announcements" | "about" | null>(null);

  // Opening the Announcements tab marks them as read.
  useEffect(() => {
    if (tab !== "announcements" || !profile || !community || !community.memberIds?.includes(profile.uid)) return;
    const count = community.announcementCount ?? 0;
    if ((profile.communitySeenCounts?.[community.id] ?? 0) !== count) {
      markCommunitySeen(profile.uid, community.id, count).catch(() => undefined);
    }
  }, [tab, profile, community]);

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  }

  if (!community) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-sm text-steel/50">No community found at /{params.slug}.</p>
      </div>
    );
  }

  const isMember = !!profile && community.memberIds?.includes(profile.uid);
  const isModerator = !!profile && community.moderatorIds?.includes(profile.uid);
  const activeTab = tab ?? (isMember ? "chat" : "about");
  const unreadAnn = isMember ? unreadAnnouncements(community, profile?.communitySeenCounts) : 0;
  activeTabRef.current = activeTab;
  const chatUnread = isMember ? chatCounts[community.id] ?? 0 : 0;

  async function handleDelete() {
    if (!community) return;
    setDeleteError(null);
    try {
      await deleteCommunity.mutateAsync(community.id);
      router.push("/communities");
    } catch (err) {
      // Surfaces the real reason instead of the button silently doing
      // nothing — usually means the Firestore rules for community deletion
      // haven't been re-published in Firebase Console yet.
      setDeleteError(
        (err as Error).message?.includes("permission")
          ? "Permission denied — check that Firestore rules have been re-published in Firebase Console."
          : (err as Error).message || "Couldn't delete this community."
      );
      setConfirmingDelete(false);
    }
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !community) return;
    const err = validateImageFile(file);
    if (err) {
      setImageError(err);
      return;
    }
    setImageError(null);
    setUploadingPhoto(true);
    try {
      const url = await uploadImage(`communities/${community.id}/dp-${Date.now()}-${safeName(file.name)}`, file);
      await updateImage.mutateAsync({ field: "photoURL", url });
    } catch {
      setImageError("Couldn't upload that image. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleBannerSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !community) return;
    const err = validateImageFile(file);
    if (err) {
      setImageError(err);
      return;
    }
    setImageError(null);
    setUploadingBanner(true);
    try {
      const url = await uploadImage(`communities/${community.id}/banner-${Date.now()}-${safeName(file.name)}`, file);
      await updateImage.mutateAsync({ field: "bannerURL", url });
    } catch {
      setImageError("Couldn't upload that image. Please try again.");
    } finally {
      setUploadingBanner(false);
    }
  }

  return (
    <div {...swipe} className="-mx-4 -mt-6 flex flex-col md:mx-0 md:mt-0 md:gap-4">
      {/* Compact top bar: back, picture, name, and one small info circle for everything else */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2.5 md:rounded-2xl md:border">
        <Link href="/messages" className="text-steel/60 hover:text-foreground" aria-label="Back to groups">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-gradient">
          {community.photoURL ? (
            <Image src={community.photoURL} alt={community.name} fill className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">{community.name[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold leading-tight text-foreground">{community.name}</h1>
          <p className="truncate text-xs text-steel/50">{community.game} · {formatCount(community.memberCount)} members</p>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">Group details</DialogTitle>
          <div className="overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => isModerator && bannerInputRef.current?.click()}
          disabled={!isModerator}
          className="relative block h-28 w-full bg-brand-gradient"
        >
          {community.bannerURL && <Image src={community.bannerURL} alt="" fill className="object-cover" />}
          {isModerator && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition-opacity hover:bg-slate-950/30 hover:opacity-100">
              <Camera className="h-5 w-5" />
            </div>
          )}
          {uploadingBanner && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-xs text-white">Uploading…</div>
          )}
        </button>
        {isModerator && (
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} />
        )}

        <div className="flex items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => isModerator && photoInputRef.current?.click()}
              disabled={!isModerator}
              className="relative -mt-10 h-16 w-16 shrink-0 overflow-hidden rounded-xl border-4 border-card bg-brand-gradient"
            >
              {community.photoURL ? (
                <Image src={community.photoURL} alt={community.name} fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                  {community.name[0]?.toUpperCase()}
                </span>
              )}
              {isModerator && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition-opacity hover:bg-slate-950/40 hover:opacity-100">
                  <Camera className="h-4 w-4" />
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-[10px] text-white">…</div>
              )}
            </button>
            {isModerator && (
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
            )}

            <div>
              <h1 className="font-display text-lg font-bold text-foreground">{community.name}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-steel/50">
                <Gamepad2 className="h-3.5 w-3.5" /> {community.game}
              </p>
              <MembersDialog community={community} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {isModerator ? (
              <div className="flex items-center gap-2">
                <EditCommunityDialog community={community} />
                {confirmingDelete ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-steel/50">Delete?</span>
                    <Button size="sm" variant="destructive" disabled={deleteCommunity.isPending} onClick={handleDelete}>
                      {deleteCommunity.isPending ? "Deleting…" : "Yes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(false)}>
                      No
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="rounded-lg p-2 text-steel/40 hover:bg-signal-red/10 hover:text-signal-red"
                    title="Delete community"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : profile ? (
              <Button
                variant={isMember ? "outline" : "default"}
                size="sm"
                disabled={toggleJoin.isPending}
                onClick={() => toggleJoin.mutate({ uid: profile.uid, currentlyMember: isMember })}
              >
                {isMember ? "Joined" : "Join"}
              </Button>
            ) : null}
          </div>
        </div>

        {imageError && <p className="px-5 pb-3 text-xs text-signal-red">{imageError}</p>}
        {deleteError && <p className="px-5 pb-3 text-sm text-signal-red">{deleteError}</p>}

      </div>
        </DialogContent>
      </Dialog>

      <div className="flex border-b border-border bg-card md:rounded-2xl md:border">
        {([
          ["chat", "Chat"],
          ["announcements", "Announcements"],
          ["about", "About"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
              activeTab === key ? "border-violet text-foreground" : "border-transparent text-steel/60"
            }`}
          >
            {label}
            {key === "chat" && chatUnread > 0 && activeTab !== "chat" && (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-signal-red px-1 text-[10px] font-bold text-white align-middle">
                {chatUnread > 99 ? "99+" : chatUnread}
              </span>
            )}
            {key === "announcements" && unreadAnn > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-signal-red px-1 align-middle text-[10px] font-bold text-white">
                {unreadAnn}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          aria-label="Group details"
          className="mx-2 my-1.5 flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full bg-muted text-foreground hover:bg-border"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>

      {activeTab === "chat" &&
        (isMember ? (
          <GroupChat community={community} />
        ) : (
          <Card className="m-4 p-8 text-center text-sm text-steel/60">Join this group to read and send messages.</Card>
        ))}

      {activeTab === "announcements" && (
        <div className="flex flex-col gap-4 px-4 pt-4 md:px-0 md:pt-0">
          {isModerator && <AnnouncementComposer communityId={community.id} />}
          <AnnouncementList
            announcements={announcements}
            loading={announcementsLoading}
            communityId={community.id}
            isModerator={isModerator}
            isMember={isMember}
          />
        </div>
      )}

      {activeTab === "about" && (
        <Card className="overflow-hidden rounded-none border-x-0 shadow-none md:rounded-2xl md:border-x">
          {!community.description && !(community.rules?.length > 0) && (
            <p className="p-6 text-center text-sm text-steel/50">No description or rules yet.</p>
          )}
        {community.description && (
          <p className="px-5 py-4 text-sm leading-relaxed text-steel/70">
            {community.description}
          </p>
        )}

        {community.rules?.length > 0 && (
          <div className="border-t border-border px-5 py-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-steel/50">
              <ShieldCheck className="h-3.5 w-3.5" /> Rules
            </h3>
            <ul className="flex flex-col gap-1.5 text-sm text-steel/70">
              {community.rules.map((rule, i) => (
                <li key={i}>• {rule}</li>
              ))}
            </ul>
          </div>
        )}
        </Card>
      )}
    </div>
  );
}
