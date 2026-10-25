"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { pushAlert } from "@/lib/pushClient";
import { useSharedSnapshot } from "@/lib/sharedSub";
import type { AppNotification, PostAuthorSnapshot } from "@/types";

interface CreateNotificationInput {
  toUid: string;
  type: AppNotification["type"];
  fromUser: PostAuthorSnapshot;
  postId?: string;
  communityId?: string;
  tournamentId?: string;
  leagueId?: string;
}

/** Fire-and-forget notification creation. Never notifies yourself. */
export async function createNotification(input: CreateNotificationInput) {
  if (input.toUid === input.fromUser.uid) return;
  try {
    const created = await addDoc(collection(db, "notifications", input.toUid, "items"), {
      type: input.type,
      fromUid: input.fromUser.uid,
      fromUser: input.fromUser,
      postId: input.postId ?? null,
      communityId: input.communityId ?? null,
      tournamentId: input.tournamentId ?? null,
      leagueId: input.leagueId ?? null,
      read: false,
      createdAt: serverTimestamp(),
    });
    pushAlert({ kind: "notification", toUid: input.toUid, notificationId: created.id });
  } catch {
    // Notifications are best-effort — never block the primary action (like,
    // comment, follow) if this write fails.
  }
}

export function useNotifications(uid: string | undefined) {
  return useQuery<AppNotification[]>({
    queryKey: ["notifications", uid],
    queryFn: async () => {
      const q = query(
        collection(db, "notifications", uid as string, "items"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
    },
    enabled: !!uid,
    refetchInterval: 30_000, // simple polling until a real-time listener is wired up
  });
}

export function useMarkAllNotificationsRead(uid: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!uid) return;
      // Every unread one (not just 50 arbitrary docs), in safe-sized batches.
      const q = query(collection(db, "notifications", uid, "items"), where("read", "==", false), limit(400));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
      await batch.commit();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", uid] }),
  });
}

export function useMarkNotificationRead(uid: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!uid) return;
      await updateDoc(doc(db, "notifications", uid, "items", notificationId), { read: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", uid] }),
  });
}

const NO_ITEMS: AppNotification[] = [];

/** Live list of unread notifications — ONE shared listener for the whole app. */
export function useUnreadNotifications(uid: string | undefined) {
  return useSharedSnapshot<AppNotification[]>(uid ? `notif-unread:${uid}` : null, NO_ITEMS, (emit) => {
    const q = query(collection(db, "notifications", uid as string, "items"), where("read", "==", false));
    return onSnapshot(
      q,
      (snap) => emit(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification))),
      () => emit(NO_ITEMS)
    );
  });
}

/** Live count of unread notifications — powers the badge on the Notifications nav item. */
export function useUnreadNotificationCount(uid: string | undefined) {
  return useUnreadNotifications(uid).length;
}
