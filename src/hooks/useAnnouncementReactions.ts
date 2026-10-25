"use client";

import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export const REACTION_EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "👏"];

/** Live reactions on one announcement: uid -> emoji. */
export function useAnnouncementReactions(communityId: string, announcementId: string) {
  const [reactions, setReactions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!communityId || !announcementId) return;
    return onSnapshot(
      collection(db, "communities", communityId, "announcements", announcementId, "reactions"),
      (snap) => {
        const next: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const e = d.data().emoji;
          if (typeof e === "string") next[d.id] = e;
        });
        setReactions(next);
      },
      () => undefined
    );
  }, [communityId, announcementId]);

  /** Picks an emoji; picking the one you already chose takes it back. */
  async function react(uid: string, emoji: string) {
    const ref = doc(db, "communities", communityId, "announcements", announcementId, "reactions", uid);
    if (reactions[uid] === emoji) {
      setReactions((r) => {
        const n = { ...r };
        delete n[uid];
        return n;
      });
      await deleteDoc(ref);
    } else {
      setReactions((r) => ({ ...r, [uid]: emoji }));
      await setDoc(ref, { uid, emoji, createdAt: serverTimestamp() });
    }
  }

  return { reactions, react };
}
