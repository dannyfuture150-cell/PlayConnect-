"use client";

import { useQuery } from "@tanstack/react-query";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Post, PostAuthorSnapshot, UserProfile } from "@/types";

export function useProfileByUsername(username: string) {
  return useQuery<UserProfile | null>({
    queryKey: ["profile", username],
    queryFn: async () => {
      const q = query(collection(db, "users"), where("username", "==", username), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as UserProfile;
    },
    enabled: !!username,
  });
}

/**
 * Posts, comments, and notifications all store a denormalized snapshot of
 * the author (display name, avatar) taken at the moment they were created —
 * that's what lets the feed render instantly without a join on every post.
 * But it means an old post still shows someone's old name/photo after they
 * change it, unless something looks up the live value. This hook does that
 * lookup (cached for 5 minutes, since many posts usually share the same
 * handful of authors) and the caller falls back to the stored snapshot
 * while it's loading or if the user no longer exists.
 */
export function useLiveAuthor(uid: string | undefined) {
  return useQuery<(PostAuthorSnapshot & { verified?: boolean }) | null>({
    queryKey: ["live-author", uid],
    queryFn: async () => {
      if (!uid) return null;
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return { uid, username: d.username, displayName: d.displayName, photoURL: d.photoURL, verified: (d.badges ?? []).includes("⭐ Verified") };
    },
    enabled: !!uid,
    staleTime: 60 * 1000,
  });
}

export function useUserPosts(uid: string | undefined) {
  return useQuery<Post[]>({
    queryKey: ["userPosts", uid],
    queryFn: async () => {
      // Deliberately no orderBy here — combining where("authorId","==",uid)
      // with orderBy("createdAt") needs a composite index that must be
      // created via the Firebase CLI, which never happened (same class of
      // bug as the messages inbox). Sorting client-side avoids needing it.
      const q = query(collection(db, "posts"), where("authorId", "==", uid), limit(100));
      const snap = await getDocs(q);
      const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
      posts.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      return posts.slice(0, 40);
    },
    enabled: !!uid,
  });
}
