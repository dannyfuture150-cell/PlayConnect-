"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { createNotification } from "@/hooks/useNotifications";
import type { Challenge, PostAuthorSnapshot } from "@/types";

const ts = (c: Challenge) => ((c.updatedAt as { toMillis?: () => number } | null)?.toMillis?.() ?? Date.now());

/** Live challenges a player is part of (as challenger or opponent), newest first. */
export function useChallenges(uid: string | undefined) {
  const [items, setItems] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "challenges"), where("participantIds", "array-contains", uid)),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge)).sort((a, b) => ts(b) - ts(a)));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [uid]);
  return { items, loading };
}

/** Win/loss record from confirmed challenges. */
export function challengeRecord(items: Challenge[], uid: string) {
  const done = items.filter((c) => c.status === "done" && c.winnerId);
  const wins = done.filter((c) => c.winnerId === uid).length;
  return { wins, losses: done.length - wins, played: done.length };
}

export async function sendChallenge(input: {
  from: PostAuthorSnapshot;
  to: PostAuthorSnapshot;
  game: string;
  bestOf: number;
  note: string;
}) {
  await addDoc(collection(db, "challenges"), {
    challengerId: input.from.uid,
    challenger: input.from,
    opponentId: input.to.uid,
    opponent: input.to,
    participantIds: [input.from.uid, input.to.uid],
    game: input.game,
    bestOf: input.bestOf,
    note: input.note,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await createNotification({ toUid: input.to.uid, type: "challenge", fromUser: input.from });
}

const patch = (id: string, data: Record<string, unknown>) =>
  updateDoc(doc(db, "challenges", id), { ...data, updatedAt: serverTimestamp() });

export const acceptChallenge = (c: Challenge) => patch(c.id, { status: "accepted" });
export const declineChallenge = (c: Challenge) => patch(c.id, { status: "declined" });
export const cancelChallenge = (c: Challenge) => patch(c.id, { status: "cancelled" });

/** One player says who won; the other must confirm. */
export const reportChallengeResult = (c: Challenge, reporterUid: string, winnerId: string) =>
  patch(c.id, { status: "reported", reportedBy: reporterUid, reportedWinnerId: winnerId });

export const confirmChallengeResult = (c: Challenge) =>
  patch(c.id, { status: "done", winnerId: c.reportedWinnerId ?? null });

/** Disagree with the reported result: back to "accepted" so it can be reported again. */
export const disputeChallengeResult = (c: Challenge) =>
  patch(c.id, { status: "accepted", reportedBy: null, reportedWinnerId: null });
