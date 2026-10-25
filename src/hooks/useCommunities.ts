"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSharedSnapshot } from "@/lib/sharedSub";
import { slugifyUsername } from "@/lib/utils";
import type { Community } from "@/types";

export function useCommunities() {
  return useQuery<Community[]>({
    queryKey: ["communities"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "communities"), orderBy("memberCount", "desc"), limit(50)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Community));
    },
  });
}

export function useCommunity(slug: string) {
  return useQuery<Community | null>({
    queryKey: ["community", slug],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "communities"), where("slug", "==", slug), limit(1)));
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Community;
    },
    enabled: !!slug,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; game: string; description: string; createdBy: string; chatMode?: "everyone" | "admins" }) => {
      let slug = slugifyUsername(input.name) || `community-${Date.now()}`;
      // Two groups can't share a link — add a short suffix if the name is taken.
      const taken = await getDocs(query(collection(db, "communities"), where("slug", "==", slug), limit(1)));
      if (!taken.empty) slug = `${slug.slice(0, 16)}${Math.random().toString(36).slice(2, 6)}`;
      const ref = doc(collection(db, "communities"));
      await setDoc(ref, {
        name: input.name,
        slug,
        game: input.game,
        description: input.description,
        photoURL: null,
        bannerURL: null,
        rules: [],
        moderatorIds: [input.createdBy],
        memberIds: [input.createdBy],
        memberCount: 1,
        chatMode: input.chatMode ?? "admins",
        createdBy: input.createdBy,
        createdAt: serverTimestamp(),
      });
      return slug;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communities"] }),
  });
}

export function useToggleJoinCommunity(communityId: string, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uid: string; currentlyMember: boolean }) => {
      const ref = doc(db, "communities", communityId);
      await updateDoc(ref, {
        memberIds: input.currentlyMember ? arrayRemove(input.uid) : arrayUnion(input.uid),
        memberCount: increment(input.currentlyMember ? -1 : 1),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", slug] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}

/** Moderator-only: edit the community's core details. */
export function useUpdateCommunity(communityId: string, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; game: string; description: string; rules: string[]; chatMode?: "everyone" | "admins" }) => {
      await updateDoc(doc(db, "communities", communityId), { ...input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", slug] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}

/** Moderator-only: remove a member from the community. */
export function useRemoveCommunityMember(communityId: string, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => {
      await updateDoc(doc(db, "communities", communityId), {
        memberIds: arrayRemove(uid),
        memberCount: increment(-1),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["community", slug] }),
  });
}

/** Creator-only: make a member an admin, or take admin away. */
export function useSetCommunityAdmin(communityId: string, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uid: string; makeAdmin: boolean }) => {
      await updateDoc(doc(db, "communities", communityId), {
        moderatorIds: input.makeAdmin ? arrayUnion(input.uid) : arrayRemove(input.uid),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["community", slug] }),
  });
}

/** Moderator-only: upload a new profile picture (dp) or banner image for the community. */
export function useUpdateCommunityImage(communityId: string, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { field: "photoURL" | "bannerURL"; url: string }) => {
      await updateDoc(doc(db, "communities", communityId), { [input.field]: input.url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", slug] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}

/** Moderator-only: permanently delete the community. */
export function useDeleteCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (communityId: string) => {
      await deleteDoc(doc(db, "communities", communityId));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communities"] }),
  });
}

/** How many announcements a member hasn't seen yet in one community. */
export function unreadAnnouncements(
  community: Pick<Community, "id" | "announcementCount">,
  seenCounts: Record<string, number> | undefined
) {
  return Math.max(0, (community.announcementCount ?? 0) - (seenCounts?.[community.id] ?? 0));
}

/** True when someone else has sent a group-chat message since this user last read the chat. */
export function hasUnreadChat(
  community: { id: string; lastChatMs?: number; lastChatBy?: string },
  uid: string | undefined,
  chatSeen: Record<string, number> | undefined
) {
  if (!uid || !community.lastChatMs || community.lastChatBy === uid) return false;
  return community.lastChatMs > (chatSeen?.[community.id] ?? 0);
}

/** Marks a group's chat as read up to now (clears its dot). */
export async function markCommunityChatSeen(uid: string, communityId: string, ms: number) {
  await updateDoc(doc(db, "users", uid), { [`communityChatSeen.${communityId}`]: ms });
}

/** Records that this user has seen all current announcements in a community (clears its badge). */
export async function markCommunitySeen(uid: string, communityId: string, count: number) {
  await updateDoc(doc(db, "users", uid), { [`communitySeenCounts.${communityId}`]: count });
}

/** Live total of unread announcements + unread chat messages across every community the user has joined — powers the Groups tab badge. */
type UnreadInfo = { id: string; announcementCount: number };
const NO_COMMUNITIES: UnreadInfo[] = [];

type ChatMeta = Record<string, { ms: number; by: string }[]>;
const NO_CHAT: ChatMeta = {};

/**
 * One shared listener on the latest messages of every group the user is in.
 * Counting from the real messages (instead of a marker on the group) means
 * numbers show up without any extra Firestore rules.
 */
function useChatMeta(uid: string | undefined): ChatMeta {
  return useSharedSnapshot<ChatMeta>(uid ? `chat-meta:${uid}` : null, NO_CHAT, (emit) => {
    const data: ChatMeta = {};
    const subs = new Map<string, () => void>();
    const stopCommunities = onSnapshot(
      query(collection(db, "communities"), where("memberIds", "array-contains", uid as string)),
      (snap) => {
        const ids = new Set(snap.docs.map((d) => d.id));
        subs.forEach((stop, id) => {
          if (!ids.has(id)) {
            stop();
            subs.delete(id);
            delete data[id];
          }
        });
        ids.forEach((id) => {
          if (subs.has(id)) return;
          subs.set(
            id,
            onSnapshot(
              query(collection(db, "communities", id, "chat"), orderBy("createdAt", "desc"), limit(30)),
              (s) => {
                data[id] = s.docs.map((d) => {
                  const m = d.data() as { createdAt?: { toMillis?: () => number }; authorId?: string };
                  return { ms: m.createdAt?.toMillis?.() ?? Date.now(), by: m.authorId ?? "" };
                });
                emit({ ...data });
              },
              () => undefined
            )
          );
        });
        emit({ ...data });
      },
      () => emit(NO_CHAT)
    );
    return () => {
      stopCommunities();
      subs.forEach((stop) => stop());
    };
  });
}

/** Unread group-chat messages per community id (messages from others newer than the last time you opened that chat). */
export function useChatUnreadCounts(uid: string | undefined, chatSeen: Record<string, number> | undefined): Record<string, number> {
  const meta = useChatMeta(uid);
  const out: Record<string, number> = {};
  Object.keys(meta).forEach((id) => {
    const seen = chatSeen?.[id] ?? 0;
    out[id] = meta[id].filter((m) => m.by !== uid && m.ms > seen).length;
  });
  return out;
}

export function useCommunityUnreadTotal(
  uid: string | undefined,
  seenCounts: Record<string, number> | undefined,
  chatSeen?: Record<string, number>
) {
  const communities = useSharedSnapshot(uid ? `community-unread:${uid}` : null, NO_COMMUNITIES, (emit) => {
    const q = query(collection(db, "communities"), where("memberIds", "array-contains", uid as string));
    return onSnapshot(
      q,
      (snap) =>
        emit(
          snap.docs.map((d) => ({
            id: d.id,
            announcementCount: d.data().announcementCount ?? 0,
          }))
        ),
      () => emit(NO_COMMUNITIES)
    );
  });
  const chat = useChatUnreadCounts(uid, chatSeen);
  return (
    communities.reduce((sum, c) => sum + unreadAnnouncements(c, seenCounts), 0) +
    Object.values(chat).reduce((a, b) => a + b, 0)
  );
}
