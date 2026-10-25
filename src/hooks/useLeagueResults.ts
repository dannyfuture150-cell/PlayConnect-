"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { addDoc, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { createNotification } from "@/hooks/useNotifications";
import { useReportLeagueMatch } from "@/hooks/useLeagues";
import { uploadImage, safeName, validateImageFile } from "@/lib/firebase/storage-helpers";
import type { LeagueMatch, LeagueResult, PostAuthorSnapshot, LeagueTeam } from "@/types";

export function useLeagueResults(leagueId: string) {
  const [results, setResults] = useState<LeagueResult[]>([]);
  useEffect(() => {
    if (!leagueId) return;
    const q = query(collection(db, "leagues", leagueId, "results"), orderBy("createdAt", "desc"), limit(300));
    return onSnapshot(
      q,
      (snap) => setResults(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeagueResult))),
      () => setResults([])
    );
  }, [leagueId]);
  return results;
}

export function useSubmitLeagueResult(leagueId: string, creatorId: string) {
  return useMutation({
    mutationFn: async (input: { match: LeagueMatch; homeScore: number; awayScore: number; image: File; submitter: PostAuthorSnapshot }) => {
      const err = validateImageFile(input.image);
      if (err) throw new Error(err);
      const imageUrl = await uploadImage(`leagues/${leagueId}/${input.submitter.uid}/${Date.now()}-${safeName(input.image.name)}`, input.image);
      await addDoc(collection(db, "leagues", leagueId, "results"), {
        leagueId,
        matchId: input.match.id,
        submittedBy: input.submitter.uid,
        submitter: input.submitter,
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        imageUrl,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await createNotification({ toUid: creatorId, type: "result_submitted", fromUser: input.submitter, leagueId });
    },
  });
}

export function useReviewLeagueResult(leagueId: string, teams: LeagueTeam[], organizer: PostAuthorSnapshot | null) {
  const report = useReportLeagueMatch(leagueId);
  return useMutation({
    mutationFn: async (input: { result: LeagueResult; approve: boolean }) => {
      const { result, approve } = input;
      if (!organizer) throw new Error("Please sign in again.");
      const resultRef = doc(db, "leagues", leagueId, "results", result.id);
      if (!approve) {
        await updateDoc(resultRef, { status: "rejected" });
        await createNotification({ toUid: result.submittedBy, type: "result_rejected", fromUser: organizer, leagueId });
        return;
      }
      const snap = await getDoc(doc(db, "leagues", leagueId, "matches", result.matchId));
      if (!snap.exists()) throw new Error("Fixture not found.");
      const match = snap.data() as LeagueMatch;
      if (match.played) {
        await updateDoc(resultRef, { status: "rejected" });
        throw new Error("This fixture was already reported.");
      }
      await report.mutateAsync({ matchId: result.matchId, homeScore: result.homeScore, awayScore: result.awayScore, reportedBy: organizer.uid });
      await updateDoc(resultRef, { status: "approved" });
      for (const tid of [match.homeTeamId, match.awayTeamId]) {
        const uid = teams.find((t) => t.id === tid)?.memberIds?.[0];
        if (uid) await createNotification({ toUid: uid, type: "result_approved", fromUser: organizer, leagueId });
      }
    },
  });
}
