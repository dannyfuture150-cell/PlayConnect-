"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { AppNotification } from "@/types";

/** Messages the PlayConnect Bot sent to this player (newest last). Small query: bot messages only. */
export function useBotInbox(uid: string | undefined) {
  return useQuery<AppNotification[]>({
    queryKey: ["bot-inbox", uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "notifications", uid as string, "items"), where("type", "==", "bot"), limit(30)));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
      return list.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    },
  });
}

/** Marks the bot's unread messages as read (when the player opens the bot chat). */
export function useMarkBotRead(uid: string | undefined) {
  const qc = useQueryClient();
  return async (items: AppNotification[]) => {
    const unread = items.filter((n) => !n.read);
    if (!uid || unread.length === 0) return;
    await Promise.all(unread.map((n) => updateDoc(doc(db, "notifications", uid, "items", n.id), { read: true }).catch(() => undefined)));
    qc.invalidateQueries({ queryKey: ["bot-inbox", uid] });
    qc.invalidateQueries({ queryKey: ["notifications", uid] });
  };
}
