"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  addDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { pushAlert } from "@/lib/pushClient";
import { useSharedSnapshot } from "@/lib/sharedSub";
import type { DirectMessage, PostAuthorSnapshot, Thread } from "@/types";

export function threadIdFor(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join("_");
}

/** Ensures a thread document exists between the two users, then returns its ID. */
export async function getOrCreateThread(me: PostAuthorSnapshot, other: PostAuthorSnapshot): Promise<string> {
  const threadId = threadIdFor(me.uid, other.uid);
  const ref = doc(db, "threads", threadId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participantIds: [me.uid, other.uid],
      participants: { [me.uid]: me, [other.uid]: other },
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      lastSenderId: "",
      lastReadBy: { [me.uid]: serverTimestamp() },
      messageCount: 0,
      createdAt: serverTimestamp(),
    });
  }
  return threadId;
}

/**
 * Live-subscribes to every thread the user is part of. Deliberately does NOT
 * combine `where(array-contains)` with `orderBy` in the same Firestore query
 * — that pairing needs a composite index that has to be created via the
 * Firebase CLI (`firebase deploy --only firestore:indexes`), which is easy to
 * forget/skip when only ever pasting security *rules* through the Console UI.
 * Sorting is done client-side instead, so this works with zero extra setup.
 */
export function useThreads(uid: string | undefined) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const q = query(collection(db, "threads"), where("participantIds", "array-contains", uid));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Thread));
        list.sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0));
        setThreads(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [uid]);

  return { data: threads, isLoading: loading, error };
}

export function useThreadMessages(threadId: string) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) return;
    setLoading(true);
    const q = query(collection(db, "threads", threadId, "messages"), orderBy("createdAt", "asc"), limitToLast(150));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DirectMessage)));
      setLoading(false);
    });
    return unsubscribe;
  }, [threadId]);

  return { messages, loading };
}

export function useSendMessage(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      text: string;
      senderId: string;
      media?: { file: File; type: "image" | "video" | "audio"; duration?: number };
      replyTo?: { id: string; name: string; text: string } | null;
    }) => {
      let mediaUrl: string | null = null;
      let mediaType: "image" | "video" | "audio" | null = null;
      const otherUid = threadId.split("_").find((id) => id && id !== input.senderId);

      if (input.media) {
        const { uploadFile } = await import("@/lib/firebase/storage-helpers");
        const path = `messages/${threadId}/${input.senderId}/${Date.now()}-${(await import("@/lib/firebase/storage-helpers")).safeName(input.media.file.name)}`;
        mediaUrl = await uploadFile(path, input.media.file);
        mediaType = input.media.type;
      }

      const sent = await addDoc(collection(db, "threads", threadId, "messages"), {
        threadId,
        senderId: input.senderId,
        text: input.text,
        mediaUrl,
        mediaType,
        mediaDuration: input.media?.type === "audio" ? input.media.duration ?? null : null,
        replyTo: input.replyTo ?? null,
        read: false,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "threads", threadId), {
        lastMessage: input.text || (mediaType === "audio" ? "🎤 Voice note" : mediaType === "video" ? "📹 Video" : mediaType === "image" ? "📷 Photo" : ""),
        lastMessageAt: serverTimestamp(),
        lastSenderId: input.senderId,
        messageCount: increment(1),
        // WhatsApp-style per-conversation unread counter for the other person
        // (thread ids are `${uidA}_${uidB}`, so the other uid comes from the id).
        ...(otherUid ? { [`unreadCounts.${otherUid}`]: increment(1) } : {}),
      });
      pushAlert({ kind: "message", threadId, messageId: sent.id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads"] }),
  });
}

/** Sender-only: deletes a single message. Doesn't touch the thread's lastMessage preview. */
export function useDeleteMessage(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      await deleteDoc(doc(db, "threads", threadId, "messages", messageId));
      await updateDoc(doc(db, "threads", threadId), { messageCount: increment(-1) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["threads"] }),
  });
}

/** Marks a thread as read by the given user — call this whenever they open it. */
export async function markThreadRead(threadId: string, uid: string) {
  await updateDoc(doc(db, "threads", threadId), {
    [`lastReadBy.${uid}`]: serverTimestamp(),
    [`unreadCounts.${uid}`]: 0,
  });
}

/**
 * Live count of threads with unread messages — a thread counts as unread
 * when the last message wasn't sent by you AND arrived after the last time
 * you opened that thread. Powers the badge on the Messages/Chat nav icon.
 */
export function useUnreadThreadCount(uid: string | undefined) {
  return useSharedSnapshot<number>(uid ? `thread-unread:${uid}` : null, 0, (emit) => {
    const q = query(collection(db, "threads"), where("participantIds", "array-contains", uid as string));
    return onSnapshot(
      q,
      (snap) => {
        let unread = 0;
        snap.docs.forEach((d) => {
          const thread = d.data() as Thread;
          if (!thread.lastMessage || thread.lastSenderId === uid) return;
          const lastRead = thread.lastReadBy?.[uid as string];
          const isUnseen = !lastRead || (thread.lastMessageAt && thread.lastMessageAt.toMillis() > lastRead.toMillis());
          // Total number of unread messages across all chats (not just chats).
          unread += thread.unreadCounts?.[uid as string] ?? (isUnseen ? 1 : 0);
        });
        emit(unread);
      },
      () => emit(0)
    );
  });
}

/** Sends a plain text message (e.g. a shared post link) into an existing thread. */
export async function sendTextToThread(threadId: string, senderId: string, text: string) {
  const otherUid = threadId.split("_").find((id) => id && id !== senderId);
  const sent = await addDoc(collection(db, "threads", threadId, "messages"), {
    threadId,
    senderId,
    text,
    mediaUrl: null,
    mediaType: null,
    mediaDuration: null,
    replyTo: null,
    read: false,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "threads", threadId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    lastSenderId: senderId,
    messageCount: increment(1),
    ...(otherUid ? { [`unreadCounts.${otherUid}`]: increment(1) } : {}),
  });
  pushAlert({ kind: "message", threadId, messageId: sent.id });
}
