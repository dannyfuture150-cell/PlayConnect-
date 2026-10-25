"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { pushAlert } from "@/lib/pushClient";
import { useSharedSnapshot } from "@/lib/sharedSub";
import type { LiveChatMessage, LiveStream, PostAuthorSnapshot } from "@/types";

const NO_LIVES: LiveStream[] = [];
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // forgotten streams drop off after 12h

/** Everyone who is live right now — ONE shared listener, newest first. */
export function useLiveNow(): LiveStream[] {
  const all = useSharedSnapshot<LiveStream[]>("lives-now", NO_LIVES, (emit) => {
    const q = query(collection(db, "lives"), where("status", "==", "live"));
    return onSnapshot(
      q,
      (snap) => emit(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LiveStream))),
      () => emit(NO_LIVES)
    );
  });
  const now = Date.now();
  return all
    .filter((l) => !l.startedAt || now - l.startedAt.toMillis() < MAX_AGE_MS)
    .sort((a, b) => (b.startedAt?.toMillis() ?? Date.now()) - (a.startedAt?.toMillis() ?? Date.now()));
}

export function useLiveStream(id: string) {
  const [live, setLive] = useState<LiveStream | null | undefined>(undefined);
  useEffect(() => {
    if (!id) return;
    return onSnapshot(
      doc(db, "lives", id),
      (snap) => setLive(snap.exists() ? ({ id: snap.id, ...snap.data() } as LiveStream) : null),
      () => setLive(null)
    );
  }, [id]);
  return live;
}

export async function startLive(input: {
  host: PostAuthorSnapshot;
  title: string;
  game: string;
  platform: LiveStream["platform"];
  url: string;
  ref: string | null;
}): Promise<string> {
  const ref = await addDoc(collection(db, "lives"), {
    hostId: input.host.uid,
    host: input.host,
    title: input.title,
    game: input.game,
    platform: input.platform,
    url: input.url,
    ref: input.ref,
    status: "live",
    startedAt: serverTimestamp(),
  });
  pushAlert({ kind: "live", liveId: ref.id });
  return ref.id;
}

export async function endLive(id: string) {
  await updateDoc(doc(db, "lives", id), { status: "ended", endedAt: serverTimestamp() });
}

export function useLiveChat(liveId: string) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  useEffect(() => {
    if (!liveId) return;
    const q = query(collection(db, "lives", liveId, "chat"), orderBy("createdAt", "asc"), limitToLast(100));
    return onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LiveChatMessage))),
      () => {}
    );
  }, [liveId]);
  return messages;
}

export async function sendLiveChat(liveId: string, author: PostAuthorSnapshot, text: string) {
  await addDoc(collection(db, "lives", liveId, "chat"), {
    authorId: author.uid,
    author,
    text: text.slice(0, 300),
    createdAt: serverTimestamp(),
  });
}

export async function deleteLiveChat(liveId: string, messageId: string) {
  await deleteDoc(doc(db, "lives", liveId, "chat", messageId));
}
