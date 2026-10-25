"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { callStars } from "@/hooks/useStars";
import { db } from "@/lib/firebase/client";
import { createNotification } from "@/hooks/useNotifications";
import type { Tournament } from "@/types";

export function useTournaments(options?: { poll?: boolean }) {
  return useQuery<Tournament[]>({
    queryKey: ["tournaments"],
    refetchInterval: options?.poll ? 120000 : false,
    queryFn: async () => {
      // Newest 100 only (so the list doesn't get slower as the app grows),
      // then put them back in soonest-first order for display.
      const snap = await getDocs(query(collection(db, "tournaments"), orderBy("startsAt", "desc"), limit(100)));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Tournament))
        .sort((a, b) => (a.startsAt?.toMillis?.() ?? 0) - (b.startsAt?.toMillis?.() ?? 0));
    },
  });
}

/** Every tournament one organiser has created (no ordering in the query, so it needs no special index). */
export function useOrganizerTournaments(organizerId: string | undefined) {
  return useQuery<Tournament[]>({
    queryKey: ["tournaments", "by", organizerId],
    enabled: !!organizerId,
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "tournaments"), where("organizerId", "==", organizerId), limit(200)));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Tournament))
        .sort((a, b) => (a.startsAt?.toMillis?.() ?? 0) - (b.startsAt?.toMillis?.() ?? 0));
    },
  });
}

export function useTournament(tournamentId: string) {
  return useQuery<Tournament | null>({
    queryKey: ["tournament", tournamentId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "tournaments", tournamentId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as Tournament;
    },
    enabled: !!tournamentId,
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      game: string;
      description: string;
      format: Tournament["format"];
      maxParticipants: number;
      startsAt: Date;
      organizerId: string;
      entryType: Tournament["entryType"];
      entryFee: string | null;
      starsFee?: number | null;
      prize: string | null;
    }) => {
      // Created on the server, which also takes the creation fee in PlayCoins.
      const r = await callStars({
        action: "createTournament",
        data: {
          title: input.title,
          game: input.game,
          description: input.description,
          format: input.format,
          maxParticipants: input.maxParticipants,
          entryType: input.entryType,
          entryFee: input.entryFee,
          starsFee: input.starsFee ?? null,
          prize: input.prize,
          startsAt: input.startsAt.getTime(),
        },
      });
      if (!r.ok) throw new Error(r.error || "Couldn't create that tournament. Please try again.");
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "tournaments" || q.queryKey[0] === "tournament",
      }),
  });
}

/**
 * Free tournaments: joining/leaving is instant (same as before).
 * Paid tournaments: "joining" instead files a request into
 * pendingParticipantIds — the organizer has to approve it (see
 * useApproveTournamentRequest) before you're actually a participant.
 * Un-requesting before approval is just removing yourself from the pending list.
 */
export function useToggleJoinTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tournamentId: string;
      uid: string;
      currentlyJoined: boolean;
      currentlyPending: boolean;
      entryType: Tournament["entryType"];
    }) => {
      if (input.entryType === "paid" && !input.currentlyJoined) {
        await updateDoc(doc(db, "tournaments", input.tournamentId), {
          pendingParticipantIds: input.currentlyPending ? arrayRemove(input.uid) : arrayUnion(input.uid),
        });
        return;
      }
      // Once the bracket exists nobody joins or leaves any more.
      const [tSnap, startedSnap] = await Promise.all([
        getDoc(doc(db, "tournaments", input.tournamentId)),
        getDocs(query(collection(db, "tournaments", input.tournamentId, "matches"), limit(1))),
      ]);
      if (tSnap.data()?.bracketStarted === true || !startedSnap.empty) {
        throw new Error(input.currentlyJoined ? "The bracket has started, so you can't leave this tournament now." : "The bracket has started, so no new players can join.");
      }
      // Only the join itself is essential, so it is its own write (it works with every version of the rules).
      await updateDoc(doc(db, "tournaments", input.tournamentId), {
        participantIds: input.currentlyJoined ? arrayRemove(input.uid) : arrayUnion(input.uid),
      });
      // Joining takes you off the waiting list — nice to have, never blocks joining.
      if (!input.currentlyJoined) {
        updateDoc(doc(db, "tournaments", input.tournamentId), { waitlistIds: arrayRemove(input.uid) }).catch(() => undefined);
        // pays whoever referred this player, right away
        callStars({ action: "sync" }).catch(() => undefined);
      }
      // Someone left: tell the people waiting for a spot.
      if (input.currentlyJoined) await notifyWaitlist(input.tournamentId);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "tournaments" || q.queryKey[0] === "tournament",
      }),
  });
}

/** Organizer-only: approves a pending (paid-entry) join request, moving them into participantIds. */
export function useApproveTournamentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tournamentId: string; uid: string }) => {
      await updateDoc(doc(db, "tournaments", input.tournamentId), {
        pendingParticipantIds: arrayRemove(input.uid),
        participantIds: arrayUnion(input.uid),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "tournaments" || q.queryKey[0] === "tournament",
      }),
  });
}

/** Organizer-only: rejects a pending join request — they're just removed from the pending list. */
export function useRejectTournamentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tournamentId: string; uid: string }) => {
      await updateDoc(doc(db, "tournaments", input.tournamentId), {
        pendingParticipantIds: arrayRemove(input.uid),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "tournaments" || q.queryKey[0] === "tournament",
      }),
  });
}

/** Organizer-only: change the tournament's status (upcoming/live/completed). */
export function useUpdateTournamentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tournamentId: string; status: Tournament["status"] }) => {
      await updateDoc(doc(db, "tournaments", input.tournamentId), { status: input.status });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "tournaments" || q.queryKey[0] === "tournament",
      }),
  });
}

/** Organizer-only: remove a specific participant. */
export function useRemoveTournamentParticipant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tournamentId: string; uid: string }) => {
      await updateDoc(doc(db, "tournaments", input.tournamentId), {
        participantIds: arrayRemove(input.uid),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "tournaments" || q.queryKey[0] === "tournament",
      }),
  });
}

/** Organizer-only: permanently delete the tournament. */
export function useDeleteTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tournamentId: string) => {
      // PlayCoins tournaments: give everyone their entry fee back first (the server only does this before the bracket starts).
      const snap = await getDoc(doc(db, "tournaments", tournamentId));
      if (snap.exists() && snap.data().entryType === "stars") {
        const r = await callStars({ action: "cancelTournament", tournamentId });
        if (!r.ok) throw new Error(r.error || "Couldn't refund the players, so the tournament wasn't deleted. Try again.");
      }
      await deleteDoc(doc(db, "tournaments", tournamentId));
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "tournaments" || q.queryKey[0] === "tournament",
      }),
  });
}

/** Tells the people on the waiting list that a spot opened (best effort). */
async function notifyWaitlist(tournamentId: string) {
  try {
    const snap = await getDoc(doc(db, "tournaments", tournamentId));
    if (!snap.exists()) return;
    const t = snap.data() as Tournament;
    const waiting = (t.waitlistIds ?? []).filter((id) => !t.participantIds.includes(id)).slice(0, 10);
    if (!waiting.length || t.status === "completed" || t.participantIds.length >= t.maxParticipants) return;
    const org = await getDoc(doc(db, "users", t.organizerId));
    const o = org.exists() ? (org.data() as { username?: string; displayName?: string; photoURL?: string | null }) : {};
    const fromUser = { uid: t.organizerId, username: o.username ?? "", displayName: o.displayName ?? "Organiser", photoURL: o.photoURL ?? null };
    await Promise.all(waiting.map((toUid) => createNotification({ toUid, type: "spot_open", fromUser, tournamentId })));
  } catch {
    // never block leaving
  }
}

/** "Notify me" on a full tournament: join or leave the waiting list. */
export function useToggleWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tournamentId: string; uid: string; onList: boolean }) => {
      await updateDoc(doc(db, "tournaments", input.tournamentId), {
        waitlistIds: input.onList ? arrayRemove(input.uid) : arrayUnion(input.uid),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "tournaments" || q.queryKey[0] === "tournament",
      }),
  });
}
