"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { uploadImage, isVideoFile, safeName } from "@/lib/firebase/storage-helpers";
import type { PostAuthorSnapshot, Story } from "@/types";

/** One entry per author — their most recent still-active story. */
export interface StoryGroup {
  author: PostAuthorSnapshot;
  stories: Story[];
}

export function useActiveStories() {
  return useQuery<StoryGroup[]>({
    queryKey: ["stories"],
    queryFn: async () => {
      const now = Timestamp.now();
      const snap = await getDocs(
        query(collection(db, "stories"), where("expiresAt", ">", now), orderBy("expiresAt", "asc"), limit(60))
      );
      const stories = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Story));

      const byAuthor = new Map<string, StoryGroup>();
      for (const story of stories) {
        const existing = byAuthor.get(story.authorId);
        if (existing) {
          existing.stories.push(story);
        } else {
          byAuthor.set(story.authorId, { author: story.author, stories: [story] });
        }
      }
      return Array.from(byAuthor.values());
    },
    staleTime: 5 * 60_000,
    refetchInterval: 15 * 60_000,
    refetchIntervalInBackground: false,
  });
}

const MAX_ACTIVE_STORIES = 5;

async function assertUnderStoryLimit(authorId: string) {
  // Deliberately just one equality filter — combining it with a second
  // inequality filter on expiresAt would need a composite index that was
  // never created via the Firebase CLI (same class of bug as the earlier
  // messages/profile-posts index issues). Filtering expiry client-side
  // avoids needing that index at all.
  const snap = await getDocs(query(collection(db, "stories"), where("authorId", "==", authorId)));
  const now = Date.now();
  const activeCount = snap.docs.filter((d) => (d.data().expiresAt as Timestamp).toMillis() > now).length;
  if (activeCount >= MAX_ACTIVE_STORIES) {
    throw new Error(`You can have up to ${MAX_ACTIVE_STORIES} active stories at once — delete an older one first.`);
  }
}

/** Photo or video story — now capped at 5 active stories per person. */
export function useCreateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; author: PostAuthorSnapshot }) => {
      await assertUnderStoryLimit(input.author.uid);
      const ref = doc(collection(db, "stories"));
      const isVideo = isVideoFile(input.file);
      const storagePath = `stories/${input.author.uid}/${ref.id}-${safeName(input.file.name)}`;
      const mediaUrl = await uploadImage(storagePath, input.file);
      const now = Date.now();
      await setDoc(ref, {
        authorId: input.author.uid,
        author: input.author,
        mediaUrl,
        storagePath,
        mediaType: isVideo ? "video" : "image",
        viewers: [],
        likes: [],
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + 24 * 60 * 60 * 1000),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });
}

/** Text-only story — just styling fields, no file upload at all. */
export function useCreateTextStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      text: string;
      fontFamily: string;
      textColor: string;
      backgroundStyle: string;
      author: PostAuthorSnapshot;
    }) => {
      await assertUnderStoryLimit(input.author.uid);
      const ref = doc(collection(db, "stories"));
      const now = Date.now();
      await setDoc(ref, {
        authorId: input.author.uid,
        author: input.author,
        mediaUrl: null,
        storagePath: null,
        mediaType: "text",
        text: input.text,
        fontFamily: input.fontFamily,
        textColor: input.textColor,
        backgroundStyle: input.backgroundStyle,
        viewers: [],
        likes: [],
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + 24 * 60 * 60 * 1000),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });
}

/** Author-only: deletes a story before it naturally expires. */
export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      await deleteDoc(doc(db, "stories", storyId));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });
}

export function useMarkStoryViewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { storyId: string; uid: string }) => {
      await updateDoc(doc(db, "stories", input.storyId), { viewers: arrayUnion(input.uid) });
    },
    // Patch the cached list so the ring segment turns grey straight away,
    // without re-downloading every story.
    onSuccess: (_d, input) => {
      queryClient.setQueryData<StoryGroup[]>(["stories"], (old) =>
        old?.map((g) => ({
          ...g,
          stories: g.stories.map((st) =>
            st.id === input.storyId && !st.viewers?.includes(input.uid)
              ? { ...st, viewers: [...(st.viewers ?? []), input.uid] }
              : st
          ),
        }))
      );
    },
  });
}

/** Double-tap like/unlike for any story type. */
export function useToggleStoryLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { storyId: string; uid: string; currentlyLiked: boolean }) => {
      await updateDoc(doc(db, "stories", input.storyId), {
        likes: input.currentlyLiked ? arrayRemove(input.uid) : arrayUnion(input.uid),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });
}
