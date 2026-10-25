"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDoc, collection, deleteDoc, doc, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { pushAlert } from "@/lib/pushClient";
import { uploadImage, safeName, validateImageFile } from "@/lib/firebase/storage-helpers";
import type { CommunityAnnouncement, PostAuthorSnapshot } from "@/types";

/** Live-subscribes to a community's announcements, newest first. */
export function useCommunityAnnouncements(communityId: string) {
  const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!communityId) return;
    setLoading(true);
    const q = query(collection(db, "communities", communityId, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityAnnouncement)));
      setLoading(false);
    });
    return unsubscribe;
  }, [communityId]);

  return { announcements, loading };
}

export function useCreateAnnouncement(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { text: string; author: PostAuthorSnapshot; image?: File }) => {
      let imageUrl: string | null = null;
      if (input.image) {
        const err = validateImageFile(input.image);
        if (err) throw new Error(err);
        imageUrl = await uploadImage(
          `communities/${communityId}/announcements/${Date.now()}-${safeName(input.image.name)}`,
          input.image
        );
      }

      const posted = await addDoc(collection(db, "communities", communityId, "announcements"), {
        communityId,
        authorId: input.author.uid,
        author: input.author,
        text: input.text,
        imageUrl,
        createdAt: serverTimestamp(),
      });
      // Members' unread badges compare this counter against what they've seen
      await updateDoc(doc(db, "communities", communityId), {
        announcementCount: increment(1),
        lastAnnouncement: input.text.slice(0, 90),
        lastAnnouncementAt: serverTimestamp(),
      });
      pushAlert({ kind: "announcement", communityId, announcementId: posted.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-announcements", communityId] });
      queryClient.invalidateQueries({ queryKey: ["community"] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}

/** Deletes an announcement — the Firestore rule restricts this to the community's moderators (which includes whoever posted it, since only moderators can post). */
export function useDeleteAnnouncement(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) => {
      await deleteDoc(doc(db, "communities", communityId, "announcements", announcementId));
      await updateDoc(doc(db, "communities", communityId), { announcementCount: increment(-1) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-announcements", communityId] });
      queryClient.invalidateQueries({ queryKey: ["community"] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}
