"use client";

import { pushAlert } from "@/lib/pushClient";
import { createNotification } from "@/hooks/useNotifications";
import { callStars } from "@/hooks/useStars";
import { callBot } from "@/lib/botClient";
import { canonicalGame } from "@/lib/leaderboardGames";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { PostAuthorSnapshot, TournamentMatch } from "@/types";

/** Live-subscribes to every match in a tournament's bracket, ordered for display. */
export function useTournamentMatches(tournamentId: string) {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    const q = query(collection(db, "tournaments", tournamentId, "matches"), orderBy("round", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TournamentMatch));
      list.sort((a, b) => (a.round !== b.round ? a.round - b.round : a.slot - b.slot));
      setMatches(list);
      setLoading(false);
    });
    return unsubscribe;
  }, [tournamentId]);

  return { matches, loading };
}

/**
 * Builds a full single-elimination bracket from the tournament's current
 * participants: shuffles them, pads to the next power of two with byes,
 * creates every round's matches up front (with each match already knowing
 * which match/slot its winner feeds into), and immediately auto-advances
 * anyone who drew a bye in round 1.
 */
export function useGenerateBracket(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (participantIds: string[]) => {
      if (participantIds.length < 2) {
        throw new Error("Need at least 2 players before starting the bracket.");
      }

      // Guard against double-taps / second tabs creating the bracket twice.
      const existing = await getDocs(query(collection(db, "tournaments", tournamentId, "matches"), limit(1)));
      if (!existing.empty) throw new Error("The bracket has already been created.");

      const snapshots = await Promise.all(
        participantIds.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          if (!snap.exists()) return null;
          const d = snap.data();
          return { uid, username: d.username, displayName: d.displayName, photoURL: d.photoURL } as PostAuthorSnapshot;
        })
      );
      const players = snapshots.filter((p): p is PostAuthorSnapshot => p !== null);

      // Fisher-Yates shuffle for a fair random seeding
      const shuffled = [...players];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let size = 2;
      while (size < shuffled.length) size *= 2;
      // Spread byes across the first slots (one player + empty) so no
      // round-1 match is ever completely empty — otherwise the next round
      // would wait forever for a player that never comes.
      const byes = size - shuffled.length;
      const padded: (PostAuthorSnapshot | null)[] = [];
      let cursor = 0;
      for (let slot = 0; slot < size / 2; slot++) {
        if (slot < byes) {
          padded.push(shuffled[cursor++], null);
        } else {
          padded.push(shuffled[cursor++], shuffled[cursor++]);
        }
      }

      const totalRounds = Math.log2(size);

      // Pre-generate every match's doc reference across all rounds first, so
      // each match can be written already knowing its nextMatchId.
      const roundRefs: ReturnType<typeof doc>[][] = [];
      for (let r = 1; r <= totalRounds; r++) {
        const count = size / 2 ** r;
        roundRefs.push(Array.from({ length: count }, () => doc(collection(db, "tournaments", tournamentId, "matches"))));
      }

      const byeAdvancements: { nextRef: ReturnType<typeof doc>; slotKey: "player1" | "player2"; winner: PostAuthorSnapshot }[] = [];
      const batch = writeBatch(db);

      for (let r = 1; r <= totalRounds; r++) {
        const refs = roundRefs[r - 1];
        const isFinalRound = r === totalRounds;

        refs.forEach((ref, slot) => {
          const nextRef = isFinalRound ? null : roundRefs[r][Math.floor(slot / 2)];
          const nextSlotKey: "player1" | "player2" | null = isFinalRound ? null : slot % 2 === 0 ? "player1" : "player2";

          let player1: PostAuthorSnapshot | null = null;
          let player2: PostAuthorSnapshot | null = null;
          if (r === 1) {
            player1 = padded[slot * 2] ?? null;
            player2 = padded[slot * 2 + 1] ?? null;
          }

          const isBye = r === 1 && (!!player1 !== !!player2); // exactly one side filled
          const winnerId = isBye ? (player1?.uid ?? player2?.uid ?? null) : null;

          batch.set(ref, {
            tournamentId,
            round: r,
            slot,
            player1Id: player1?.uid ?? null,
            player1,
            player2Id: player2?.uid ?? null,
            player2,
            player1Score: null,
            player2Score: null,
            winnerId,
            nextMatchId: nextRef?.id ?? null,
            nextMatchSlotKey: nextSlotKey,
            isBye,
            createdAt: serverTimestamp(),
          });

          if (isBye && nextRef && nextSlotKey) {
            byeAdvancements.push({ nextRef, slotKey: nextSlotKey, winner: (player1 ?? player2) as PostAuthorSnapshot });
          }
        });
      }

      // Mark the tournament as started, so players can no longer leave it (also enforced in the rules).
      batch.update(doc(db, "tournaments", tournamentId), { bracketStarted: true });
      await batch.commit();

      // Second pass: write bye winners into the next round's slots now that
      // those match docs actually exist.
      if (byeAdvancements.length) {
        const batch2 = writeBatch(db);
        for (const adv of byeAdvancements) {
          batch2.update(adv.nextRef, {
            [`${adv.slotKey}Id`]: adv.winner.uid,
            [adv.slotKey]: adv.winner,
          });
        }
        await batch2.commit();
      }

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      // Starting the bracket releases the organiser's PlayCoins entry fees.
      callStars({ action: "sync" }).catch(() => undefined);
      // The bot tells players their first match is ready.
      callBot({ action: "matches", tournamentId }).catch(() => undefined);
    },
  });
}

/**
 * Reports a match score and — this is the "automatic linking" — writes the
 * winner straight into their next match's slot in the same batched write.
 * On the FINAL match specifically, also bumps tournamentWins + per-game
 * wins and awards a champion badge, and returns that info so the calling
 * component knows whether to show the victory celebration.
 */
export function useReportBracketResult(tournamentId: string, game: string, organizerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; player1Score: number; player2Score: number }) => {
      const matchRef = doc(db, "tournaments", tournamentId, "matches", input.matchId);
      const snap = await getDoc(matchRef);
      if (!snap.exists()) throw new Error("Match not found.");
      const match = snap.data() as TournamentMatch;

      if (!match.player1Id || !match.player2Id) {
        throw new Error("Both players need to be set before reporting a score.");
      }
      if (input.player1Score === input.player2Score) {
        throw new Error("Elimination matches need a winner — scores can't be tied.");
      }

      const winner = input.player1Score > input.player2Score ? match.player1 : match.player2;
      const isFinal = !match.nextMatchId;

      let trophyRef: ReturnType<typeof doc> | null = null;
      let advanceRef: ReturnType<typeof doc> | null = null;
      const batch = writeBatch(db);
      batch.update(matchRef, {
        player1Score: input.player1Score,
        player2Score: input.player2Score,
        winnerId: winner?.uid ?? null,
      });

      if (match.nextMatchId && match.nextMatchSlotKey && winner) {
        const nextRef = doc(db, "tournaments", tournamentId, "matches", match.nextMatchId);
        batch.update(nextRef, {
          [`${match.nextMatchSlotKey}Id`]: winner.uid,
          [match.nextMatchSlotKey]: winner,
        });
        // "Bracket updated — you moved to the semi-final"
        let roundLabel = `round ${match.round + 1}`;
        try {
          const all = await getDocs(collection(db, "tournaments", tournamentId, "matches"));
          const maxRound = all.docs.reduce((m, d) => Math.max(m, Number((d.data() as { round?: number }).round ?? 0)), 0);
          const fromEnd = maxRound - (match.round + 1);
          roundLabel = fromEnd <= 0 ? "final" : fromEnd === 1 ? "semi-final" : fromEnd === 2 ? "quarter-final" : `round ${match.round + 1}`;
        } catch {
          // keep the generic label
        }
        const tInfo = await getDoc(doc(db, "tournaments", tournamentId));
        advanceRef = doc(collection(db, "notifications", winner.uid, "items"));
        batch.set(advanceRef, {
          type: "advanced",
          fromUid: organizerId,
          fromUser: winner,
          tournamentId,
          tournamentTitle: tInfo.exists() ? ((tInfo.data() as { title?: string }).title ?? "") : "",
          roundLabel,
          read: false,
          createdAt: serverTimestamp(),
        });
      } else if (isFinal && winner) {
        // No next match — this was the final. Tournament's done, and the
        // winner's tournamentWins/gameWins go up, feeding directly into
        // their computed rank (see lib/rank.ts) and the leaderboard.
        batch.update(doc(db, "tournaments", tournamentId), { status: "completed", winnerId: winner.uid });
        batch.update(doc(db, "users", winner.uid), {
          tournamentWins: increment(1),
          [`gameWins.${canonicalGame(game)}`]: increment(1),
          badges: arrayUnion("🏆 Tournament Champion"),
        });
        // Trophy notification — the winner sees a celebration with the
        // prize the next time they open the app.
        const tSnap = await getDoc(doc(db, "tournaments", tournamentId));
        const tData = tSnap.exists() ? (tSnap.data() as { title?: string; prize?: string | null }) : {};
        trophyRef = doc(collection(db, "notifications", winner.uid, "items"));
        batch.set(trophyRef, {
          type: "trophy_win",
          fromUid: organizerId,
          fromUser: winner,
          tournamentId,
          tournamentTitle: tData.title ?? "",
          prize: tData.prize ?? null,
          game: canonicalGame(game),
          read: false,
          createdAt: serverTimestamp(),
        });
        // Credits the organizer too — this is what their rank is tied to,
        // separately from the winning player's own rank.
        batch.update(doc(db, "users", organizerId), { successfulTournamentsOrganized: increment(1) });
      }

      await batch.commit();
      if (trophyRef && winner) pushAlert({ kind: "notification", toUid: winner.uid, notificationId: (trophyRef as ReturnType<typeof doc>).id });
      if (advanceRef && winner) pushAlert({ kind: "notification", toUid: winner.uid, notificationId: (advanceRef as ReturnType<typeof doc>).id });
      return { isFinal, winner };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      // If a winner's next match now has both players, the bot tells them it's ready.
      callBot({ action: "matches", tournamentId }).catch(() => undefined);
    },
  });
}

/**
 * Organiser (or admin) reverses a decided match: the score is cleared, the
 * winner is taken back out of their next match, and the match can be scored
 * again. If it was the FINAL, the champion's win, badge and the tournament's
 * "completed" state are undone too. Blocked while the next match has already
 * been played (reverse that one first) or the prize is marked as paid.
 */
export function useReverseBracketResult(
  tournamentId: string,
  game: string,
  organizerId: string,
  actor: PostAuthorSnapshot | null
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string }) => {
      if (!actor) throw new Error("Please sign in again.");
      const matchRef = doc(db, "tournaments", tournamentId, "matches", input.matchId);
      const snap = await getDoc(matchRef);
      if (!snap.exists()) throw new Error("Match not found.");
      const match = snap.data() as TournamentMatch;
      if (match.isBye) throw new Error("A bye can't be reversed.");
      if (!match.winnerId) throw new Error("This match has no result to reverse.");
      const winnerId = match.winnerId;

      const batch = writeBatch(db);
      batch.update(matchRef, { player1Score: null, player2Score: null, winnerId: null });

      let wasFinal = false;
      if (match.nextMatchId && match.nextMatchSlotKey) {
        const nextRef = doc(db, "tournaments", tournamentId, "matches", match.nextMatchId);
        const nextSnap = await getDoc(nextRef);
        if (nextSnap.exists()) {
          const next = nextSnap.data() as TournamentMatch;
          if (next.winnerId) {
            throw new Error("The next match has already been played. Reverse that one first.");
          }
          if ((next as any)[`${match.nextMatchSlotKey}Id`] === winnerId) {
            batch.update(nextRef, { [`${match.nextMatchSlotKey}Id`]: null, [match.nextMatchSlotKey]: null });
          }
        }
      } else {
        wasFinal = true;
        const tRef = doc(db, "tournaments", tournamentId);
        const tSnap = await getDoc(tRef);
        const t = (tSnap.data() ?? {}) as { prizePaid?: boolean; winnerId?: string };
        if (t.prizePaid) {
          throw new Error("The prize is already marked as paid. Un-mark it first, then reverse the final.");
        }
        batch.update(tRef, { status: "live", winnerId: deleteField(), prizeConfirmed: deleteField() });

        // Take the win away from the champion (never below zero), and the badge if it was their only one.
        const winnerRef = doc(db, "users", winnerId);
        const wSnap = await getDoc(winnerRef);
        if (wSnap.exists()) {
          const w = wSnap.data() as { tournamentWins?: number; gameWins?: Record<string, number> };
          const key = canonicalGame(game);
          const wins = w.tournamentWins ?? 0;
          const update: Record<string, unknown> = {};
          if (wins > 0) update.tournamentWins = increment(-1);
          if ((w.gameWins?.[key] ?? 0) > 0) update[`gameWins.${key}`] = increment(-1);
          if (wins <= 1) update.badges = arrayRemove("🏆 Tournament Champion");
          if (Object.keys(update).length) batch.update(winnerRef, update);
        }

        // The organiser no longer gets credit for a finished tournament.
        const orgRef = doc(db, "users", organizerId);
        const oSnap = await getDoc(orgRef);
        if (oSnap.exists() && ((oSnap.data() as { successfulTournamentsOrganized?: number }).successfulTournamentsOrganized ?? 0) > 0) {
          batch.update(orgRef, { successfulTournamentsOrganized: increment(-1) });
        }
      }

      // The submission that was approved for this match is no longer valid.
      const resSnap = await getDocs(query(collection(db, "tournaments", tournamentId, "results"), where("matchId", "==", input.matchId)));
      resSnap.docs.forEach((d) => {
        if ((d.data() as { status?: string }).status === "approved") batch.update(d.ref, { status: "reversed" });
      });

      await batch.commit();

      // Tell both players, so nobody is surprised when the bracket changes.
      for (const uid of [match.player1Id, match.player2Id]) {
        if (uid) await createNotification({ toUid: uid, type: "result_reversed", fromUser: actor, tournamentId });
      }
      return { wasFinal };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    },
  });
}
