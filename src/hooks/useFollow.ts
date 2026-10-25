"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDoc, doc, increment, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { createNotification } from "@/hooks/useNotifications";
import type { PostAuthorSnapshot } from "@/types";

const backfilled = new Set<string>();

/** Live-subscribes to whether `viewerUid` currently follows `targetUid`. */
export function useIsFollowing(targetUid: string, viewerUid: string | undefined) {
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!viewerUid || viewerUid === targetUid) return;
    return onSnapshot(doc(db, "followers", targetUid, "list", viewerUid), (snap) => {
      setIsFollowing(snap.exists());
      // Older follows have no "following" record yet — add it once so they show in the Following list.
      const key = `${viewerUid}>${targetUid}`;
      if (snap.exists() && !backfilled.has(key)) {
        backfilled.add(key);
        setDoc(doc(db, "following", viewerUid, "list", targetUid), { uid: targetUid, createdAt: serverTimestamp() }, { merge: true }).catch(() => undefined);
      }
    });
  }, [targetUid, viewerUid]);

  return isFollowing;
}

export function useToggleFollow(targetUid: string, viewer: PostAuthorSnapshot | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (currentlyFollowing: boolean) => {
      if (!viewer) throw new Error("Must be signed in to follow");
      const edgeRef = doc(db, "followers", targetUid, "list", viewer.uid);
      const followingRef = doc(db, "following", viewer.uid, "list", targetUid);
      const targetRef = doc(db, "users", targetUid);
      const viewerRef = doc(db, "users", viewer.uid);

      // Batched so the follow record and both counters rise or fall
      // together — if Firestore rules reject any single write in the
      // batch, the WHOLE batch is rejected, instead of the follow record
      // getting created while the counter update silently fails (which is
      // what was happening before: button flips to "Following" but the
      // follower count never moves).
      const batch = writeBatch(db);
      if (currentlyFollowing) {
        batch.delete(edgeRef);
        batch.delete(followingRef);
        batch.update(targetRef, { followersCount: increment(-1) });
        batch.update(viewerRef, { followingCount: increment(-1) });
      } else {
        batch.set(edgeRef, { uid: viewer.uid, createdAt: serverTimestamp() });
        batch.set(followingRef, { uid: targetUid, createdAt: serverTimestamp() });
        batch.update(targetRef, { followersCount: increment(1) });
        batch.update(viewerRef, { followingCount: increment(1) });
      }
      await batch.commit();

      if (!currentlyFollowing) {
        await createNotification({ toUid: targetUid, type: "follow", fromUser: viewer });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
