"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { addDoc, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { createNotification } from "@/hooks/useNotifications";
import { useReportBracketResult } from "@/hooks/useBracket";
import { uploadImage, safeName, validateImageFile } from "@/lib/firebase/storage-helpers";
import type { MatchResult, PostAuthorSnapshot, TournamentMatch } from "@/types";

/** Live list of submitted results for a tournament (newest first). */
export function useTournamentResults(tournamentId: string) {
  const [results, setResults] = useState<MatchResult[]>([]);
  useEffect(() => {
    if (!tournamentId) return;
    const q = query(collection(db, "tournaments", tournamentId, "results"), orderBy("createdAt", "desc"), limit(200));
    return onSnapshot(
      q,
      (snap) => setResults(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchResult))),
      () => setResults([])
    );
  }, [tournamentId]);
  return results;
}

/** A player sends in their score + screenshot for their match. */
export function useSubmitResult(tournamentId: string, tournamentTitle: string, organizerId: string) {
  return useMutation({
    mutationFn: async (input: { match: TournamentMatch; player1Score: number; player2Score: number; image: File; submitter: PostAuthorSnapshot }) => {
      const err = validateImageFile(input.image);
      if (err) throw new Error(err);
      if (input.player1Score === input.player2Score) throw new Error("Scores can't be tied in a knockout match.");
      const imageUrl = await uploadImage(`tournaments/${tournamentId}/${input.submitter.uid}/${Date.now()}-${safeName(input.image.name)}`, input.image);
      await addDoc(collection(db, "tournaments", tournamentId, "results"), {
        tournamentId,
        matchId: input.match.id,
        submittedBy: input.submitter.uid,
        submitter: input.submitter,
        player1Score: input.player1Score,
        player2Score: input.player2Score,
        imageUrl,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await createNotification({ toUid: organizerId, type: "result_submitted", fromUser: input.submitter, tournamentId });
    },
  });
}

/** Organiser approves (applies the score + advances the winner) or rejects a submitted result. */
export function useReviewResult(tournamentId: string, game: string, organizerId: string, organizer: PostAuthorSnapshot | null) {
  const report = useReportBracketResult(tournamentId, game, organizerId);
  return useMutation({
    mutationFn: async (input: { result: MatchResult; approve: boolean }) => {
      const { result, approve } = input;
      const resultRef = doc(db, "tournaments", tournamentId, "results", result.id);
      if (!organizer) throw new Error("Please sign in again.");

      if (!approve) {
        await updateDoc(resultRef, { status: "rejected" });
        await createNotification({ toUid: result.submittedBy, type: "result_rejected", fromUser: organizer, tournamentId });
        return;
      }

      const matchRef = doc(db, "tournaments", tournamentId, "matches", result.matchId);
      const snap = await getDoc(matchRef);
      if (!snap.exists()) throw new Error("Match not found.");
      const match = snap.data() as TournamentMatch;
      if (match.winnerId) {
        await updateDoc(resultRef, { status: "rejected" });
        throw new Error("This match was already decided.");
      }

      await report.mutateAsync({ matchId: result.matchId, player1Score: result.player1Score, player2Score: result.player2Score });
      await updateDoc(resultRef, { status: "approved" });

      // Tell both players the result stands.
      for (const uid of [match.player1Id, match.player2Id]) {
        if (uid) await createNotification({ toUid: uid, type: "result_approved", fromUser: organizer, tournamentId });
      }
      // If the winner's next match now has both players, tell them it's ready.
      if (match.nextMatchId) {
        const next = await getDoc(doc(db, "tournaments", tournamentId, "matches", match.nextMatchId));
        const nd = next.data() as TournamentMatch | undefined;
        if (nd?.player1Id && nd?.player2Id) {
          for (const uid of [nd.player1Id, nd.player2Id]) {
            await createNotification({ toUid: uid, type: "match_ready", fromUser: organizer, tournamentId });
          }
        }
      }
    },
  });
}
