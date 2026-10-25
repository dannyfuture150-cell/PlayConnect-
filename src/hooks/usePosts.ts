"use client";

import { pushAlert } from "@/lib/pushClient";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentSnapshot,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { uploadFile, uploadImage, safeName } from "@/lib/firebase/storage-helpers";
import { createNotification } from "@/hooks/useNotifications";
import type { Post, PostAuthorSnapshot, PlayerCardSnapshot } from "@/types";

const PAGE_SIZE = 10;

interface FeedPage {
  posts: Post[];
  cursor: QueryDocumentSnapshot | null;
}

/** Infinite-scrolling feed, newest posts first. */
export function useFeed() {
  return useInfiniteQuery<FeedPage>({
    queryKey: ["feed"],
    initialPageParam: null as QueryDocumentSnapshot | null,
    queryFn: async ({ pageParam }) => {
      const base = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        ...(pageParam ? [startAfter(pageParam as DocumentSnapshot)] : []),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(base);
      return {
        posts: snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)),
        cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      };
    },
    getNextPageParam: (lastPage) => (lastPage.posts.length === PAGE_SIZE ? lastPage.cursor : undefined),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      text: string;
      author: PostAuthorSnapshot;
      images?: File[];
      video?: File;
      gameTag?: string;
      onProgress?: (pct: number) => void;
      existingImageUrl?: string; // an already-uploaded photo (e.g. a tournament screenshot) to attach
      card?: PlayerCardSnapshot; // a player card to post (shown as a small flippable card)
    }) => {
      // Generate the doc ID up front so uploaded media can live at
      // posts/{uid}/{postId}/... before the Firestore doc itself exists.
      const postRef = doc(collection(db, "posts"));

      let mediaUrls: string[] = [];
      let mediaType: "none" | "image" | "video" = "none";

      if (input.video) {
        const videoUrl = await uploadFile(`posts/${input.author.uid}/${postRef.id}/clip-${safeName(input.video.name)}`, input.video, input.onProgress);
        mediaUrls = [videoUrl];
        mediaType = "video";
      } else if (input.existingImageUrl && !input.images?.length) {
        mediaUrls = [input.existingImageUrl];
        mediaType = "image";
      } else if (input.images?.length) {
        const files = input.images;
        const per = files.map(() => 0);
        mediaUrls = await Promise.all(
          files.map((file, i) =>
            uploadImage(`posts/${input.author.uid}/${postRef.id}/${Date.now()}-${i}-${safeName(file.name)}`, file, (pct) => {
              per[i] = pct;
              input.onProgress?.(Math.round(per.reduce((a, b) => a + b, 0) / files.length));
            })
          )
        );
        mediaType = "image";
      }

      await setDoc(postRef, {
        authorId: input.author.uid,
        author: input.author,
        text: input.text,
        mediaUrls,
        mediaType,
        gameTag: input.gameTag ?? null,
        ...(input.card ? { card: input.card } : {}),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        savesCount: 0,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", input.author.uid), {
        postsCount: increment(1),
      });
      if (mediaType === "video") pushAlert({ kind: "post", postId: postRef.id });
      return postRef.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
}

type CountDelta = Partial<Record<"likesCount" | "commentsCount" | "savesCount" | "sharesCount", number>>;

/**
 * Updates counts on already-loaded posts in every cached list (feed, profile
 * posts, explore, saved) instead of refetching all the pages. Previously each
 * like/comment re-downloaded every loaded feed page — slow and costly on phones.
 */
function patchPostCounts(queryClient: ReturnType<typeof useQueryClient>, postId: string, delta: CountDelta) {
  const apply = (p: Post): Post => {
    if (p.id !== postId) return p;
    const next = { ...p } as any;
    for (const [k, v] of Object.entries(delta)) next[k] = Math.max(0, (next[k] ?? 0) + (v ?? 0));
    return next as Post;
  };
  queryClient.setQueriesData<any>({ queryKey: ["feed"] }, (old: any) =>
    old?.pages ? { ...old, pages: old.pages.map((pg: any) => ({ ...pg, posts: pg.posts.map(apply) })) } : old
  );
  for (const key of ["userPosts", "trending-posts", "saved-posts"]) {
    queryClient.setQueriesData<any>({ queryKey: [key] }, (old: any) => (Array.isArray(old) ? old.map(apply) : old));
  }
}

export function useToggleLike(postId: string, postAuthorId: string, uid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { currentlyLiked: boolean; liker: PostAuthorSnapshot }) => {
      const likeRef = doc(db, "posts", postId, "likes", uid);
      const postRef = doc(db, "posts", postId);
      if (input.currentlyLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, { uid, createdAt: serverTimestamp() });
        await updateDoc(postRef, { likesCount: increment(1) });
        await createNotification({ toUid: postAuthorId, type: "like", fromUser: input.liker, postId });
      }
    },
    onSuccess: (_d, input) => patchPostCounts(queryClient, postId, { likesCount: input.currentlyLiked ? -1 : 1 }),
  });
}

export function useAddComment(postId: string, postAuthorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      text: string;
      author: PostAuthorSnapshot;
      parentId?: string | null;
      parentAuthorId?: string | null;
      replyTo?: { uid: string; displayName: string } | null;
    }) => {
      await addDoc(collection(db, "posts", postId, "comments"), {
        postId,
        authorId: input.author.uid,
        author: input.author,
        text: input.text,
        createdAt: serverTimestamp(),
        ...(input.parentId ? { parentId: input.parentId, parentAuthorId: input.parentAuthorId ?? null, replyTo: input.replyTo ?? null } : {}),
      });
      await updateDoc(doc(db, "posts", postId), { commentsCount: increment(1) });
      await createNotification({ toUid: postAuthorId, type: "comment", fromUser: input.author, postId });
      // Also tell the person being replied to (if they're someone other than the post author)
      if (input.replyTo && input.replyTo.uid !== postAuthorId) {
        await createNotification({ toUid: input.replyTo.uid, type: "comment", fromUser: input.author, postId });
      }
    },
    onSuccess: () => patchPostCounts(queryClient, postId, { commentsCount: 1 }),
  });
}

/**
 * Deletes a comment — the comment's own author or the post's author can do this
 * (matches the Firestore rule). Deleting a top-level comment also removes its replies.
 */
export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { commentId: string; replyIds?: string[] }) => {
      let removed = 0;
      for (const rid of input.replyIds ?? []) {
        try {
          await deleteDoc(doc(db, "posts", postId, "comments", rid));
          removed++;
        } catch {
          /* not allowed to delete this reply — leave it */
        }
      }
      await deleteDoc(doc(db, "posts", postId, "comments", input.commentId));
      await updateDoc(doc(db, "posts", postId), { commentsCount: increment(-(removed + 1)) });
      return removed + 1;
    },
    onSuccess: (n) => patchPostCounts(queryClient, postId, { commentsCount: -(n ?? 1) }),
  });
}

/**
 * Bookmarks/unbookmarks a post. Stored as an array on the user's own
 * profile (savedPostIds) rather than a posts/{id}/saves subcollection —
 * that avoids needing a Firestore collection-group index to later list
 * "my saved posts" (same class of setup trap as the messages/profile-posts
 * index bugs earlier), since reading your own savedPostIds is just a plain
 * profile read.
 */
export function useToggleSave(postId: string, uid: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (currentlySaved: boolean) => {
      if (!uid) throw new Error("Must be signed in to save posts");
      const postRef = doc(db, "posts", postId);
      const userRef = doc(db, "users", uid);
      if (currentlySaved) {
        await updateDoc(postRef, { savesCount: increment(-1) });
        await updateDoc(userRef, { savedPostIds: arrayRemove(postId) });
      } else {
        await updateDoc(postRef, { savesCount: increment(1) });
        await updateDoc(userRef, { savedPostIds: arrayUnion(postId) });
      }
    },
    onSuccess: (_d, currentlySaved) => {
      patchPostCounts(queryClient, postId, { savesCount: currentlySaved ? -1 : 1 });
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });
}

/** Fetches the current user's saved posts, most-recently-saved first. */
export function useSavedPosts(savedPostIds: string[] | undefined) {
  return useQuery<Post[]>({
    queryKey: ["saved-posts", savedPostIds],
    queryFn: async () => {
      const ids = [...(savedPostIds ?? [])].reverse().slice(0, 30);
      const docs = await Promise.all(ids.map((id) => getDoc(doc(db, "posts", id))));
      return docs
        .filter((d) => d.exists())
        .map((d) => ({ id: d.id, ...d.data() } as Post));
    },
    enabled: !!savedPostIds && savedPostIds.length > 0,
  });
}

/** Bumps the share counter — called whenever someone actually shares (native share sheet or copy-link). */
export async function recordShare(postId: string) {
  await updateDoc(doc(db, "posts", postId), { sharesCount: increment(1) });
}

/** Author-only: deletes a post, including its likes/comments subcollections, and decrements postsCount. */
export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { postId: string; authorId: string }) => {
      const [likesSnap, commentsSnap] = await Promise.all([
        getDocs(collection(db, "posts", input.postId, "likes")),
        getDocs(collection(db, "posts", input.postId, "comments")),
      ]);

      // Firestore doesn't cascade-delete subcollections when the parent doc
      // is deleted — without this they'd linger as orphaned data forever.
      const batch = writeBatch(db);
      likesSnap.docs.forEach((d) => batch.delete(d.ref));
      commentsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, "posts", input.postId));
      batch.update(doc(db, "users", input.authorId), { postsCount: increment(-1) });
      await batch.commit();
    },
    onSuccess: () => {
      for (const key of ["feed", "userPosts", "trending-posts", "saved-posts"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

/** Live-subscribes to whether the given user has liked a post (for the like button state). */
export function subscribeToLikeStatus(postId: string, uid: string, cb: (liked: boolean) => void) {
  let alive = true;
  getDoc(doc(db, "posts", postId, "likes", uid)).then((snap) => alive && cb(snap.exists())).catch(() => {});
  return () => {
    alive = false;
  };
}
