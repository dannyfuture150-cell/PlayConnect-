"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { callBot } from "@/lib/botClient";
import type { League, LeagueMatch, LeagueTeam, PostAuthorSnapshot } from "@/types";

export function useLeagues() {
  return useQuery<League[]>({
    queryKey: ["leagues"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "leagues"), orderBy("createdAt", "desc"), limit(50)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as League));
    },
  });
}

export function useLeague(leagueId: string) {
  return useQuery<League | null>({
    queryKey: ["league", leagueId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "leagues", leagueId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as League;
    },
    enabled: !!leagueId,
  });
}

/** Teams sorted for a standings table: points desc, then goal difference desc. */
export function useLeagueTeams(leagueId: string) {
  return useQuery<LeagueTeam[]>({
    queryKey: ["league-teams", leagueId],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "leagues", leagueId, "teams"));
      const teams = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeagueTeam));
      return teams.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        return gdB - gdA;
      });
    },
    enabled: !!leagueId,
  });
}

export function useLeagueMatches(leagueId: string) {
  return useQuery<LeagueMatch[]>({
    queryKey: ["league-matches", leagueId],
    queryFn: async () => {
      // No orderBy alongside this — a plain unfiltered collection read
      // doesn't need one, and sorting client-side avoids any composite
      // index requirement entirely.
      const snap = await getDocs(collection(db, "leagues", leagueId, "matches"));
      const matches = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeagueMatch));
      matches.sort((a, b) => (a.round !== b.round ? a.round - b.round : 0));
      return matches;
    },
    enabled: !!leagueId,
  });
}

/** Creates the league itself — no teams yet. Participants join individually afterward. */
export function useCreateLeague() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      game: string;
      description: string;
      maxParticipants: number;
      creatorId: string;
      entryType: League["entryType"];
      entryFee: string | null;
      prize: string | null;
    }) => {
      const leagueRef = doc(collection(db, "leagues"));
      await setDoc(leagueRef, {
        name: input.name,
        game: input.game,
        description: input.description,
        creatorId: input.creatorId,
        maxParticipants: input.maxParticipants,
        entryType: input.entryType,
        entryFee: input.entryType === "paid" ? input.entryFee : null,
        prize: input.prize,
        teamsCount: 0,
        matchesCount: 0,
        pendingParticipantIds: [],
        started: false,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", input.creatorId), { leaguesOrganized: increment(1) });
      return leagueRef.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leagues"] }),
  });
}

/** Creator-only: permanently deletes the league, including its teams and match history. */
export function useDeleteLeague() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leagueId: string) => {
      const [teamsSnap, matchesSnap] = await Promise.all([
        getDocs(collection(db, "leagues", leagueId, "teams")),
        getDocs(collection(db, "leagues", leagueId, "matches")),
      ]);

      // Firestore doesn't cascade-delete subcollections when you delete a
      // parent doc — without this, the teams/matches would keep existing
      // as orphaned data forever even though the league itself is gone.
      const batch = writeBatch(db);
      teamsSnap.docs.forEach((d) => batch.delete(d.ref));
      matchesSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, "leagues", leagueId));
      await batch.commit();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leagues"] }),
  });
}

/**
 * Joins a league as an individual participant — each join creates its own
 * single-member "team" (so the existing standings/match schema can stay
 * the same shape), rather than being load-balanced onto a shared team with
 * other people. Rejects once maxParticipants is reached, or once the
 * schedule has already been generated.
 */
async function createParticipantTeam(leagueId: string, participant: PostAuthorSnapshot) {
  const teamRef = doc(collection(db, "leagues", leagueId, "teams"));
  const batch = writeBatch(db);
  batch.set(teamRef, {
    leagueId,
    name: participant.displayName,
    memberIds: [participant.uid],
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, "leagues", leagueId), { teamsCount: increment(1) });
  await batch.commit();
}

/**
 * Free leagues: joining creates your participant slot instantly (same as
 * before). Paid leagues: "joining" instead files a request into
 * pendingParticipantIds — the organizer approves it (see
 * useApproveLeagueRequest) before your slot is actually created.
 */
export function useJoinLeague(leagueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (participant: PostAuthorSnapshot) => {
      const [leagueSnap, teamsSnap] = await Promise.all([
        getDoc(doc(db, "leagues", leagueId)),
        getDocs(collection(db, "leagues", leagueId, "teams")),
      ]);
      if (!leagueSnap.exists()) throw new Error("League not found.");
      const league = leagueSnap.data() as League;

      if (league.started) throw new Error("This league's schedule has already started — no new joins.");

      const alreadyIn = teamsSnap.docs.some((d) => (d.data().memberIds as string[])?.includes(participant.uid));
      const alreadyPending = league.pendingParticipantIds?.includes(participant.uid);
      if (alreadyIn || alreadyPending) return;

      if (teamsSnap.size >= league.maxParticipants) {
        throw new Error("This league is full.");
      }

      if (league.entryType === "paid") {
        await updateDoc(doc(db, "leagues", leagueId), {
          pendingParticipantIds: arrayUnion(participant.uid),
        });
        return;
      }

      await createParticipantTeam(leagueId, participant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league-teams", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league", leagueId] });
    },
  });
}

/**
 * Creator-only: generates a full home-and-away round-robin schedule from
 * however many participants have joined so far — every participant plays
 * every other participant exactly twice (once at home, once away), so the
 * total match count is always n * (n - 1). Uses the standard "circle
 * method" so each matchday (round) has every participant playing exactly
 * once (or sitting out, for an odd number of players).
 */
/** Creator-only: approves a pending (paid-entry) join request, actually creating their participant slot. */
export function useApproveLeagueRequest(leagueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (participant: PostAuthorSnapshot) => {
      await createParticipantTeam(leagueId, participant);
      await updateDoc(doc(db, "leagues", leagueId), {
        pendingParticipantIds: arrayRemove(participant.uid),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league-teams", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league", leagueId] });
    },
  });
}

/** Creator-only: rejects a pending join request — just removed from the pending list. */
export function useRejectLeagueRequest(leagueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uid: string) => {
      await updateDoc(doc(db, "leagues", leagueId), { pendingParticipantIds: arrayRemove(uid) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["league", leagueId] }),
  });
}

export function useStartLeague(leagueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const teamsSnap = await getDocs(collection(db, "leagues", leagueId, "teams"));
      const teams = teamsSnap.docs.map((d) => ({ id: d.id, name: d.data().name as string }));

      if (teams.length < 2) {
        throw new Error("Need at least 2 participants before starting the league.");
      }

      // Circle method: fix one team, rotate the rest each round. If there's
      // an odd number of participants, pad with a "bye" slot (null) — that
      // round's fixture against the bye is simply skipped.
      const ids: (string | null)[] = teams.map((t) => t.id);
      if (ids.length % 2 !== 0) ids.push(null);
      const n = ids.length;
      const roundsCount = n - 1;

      type Fixture = { homeId: string; awayId: string; round: number };
      const firstLegFixtures: Fixture[] = [];

      const rotating = ids.slice(1);
      let fixed = ids[0];
      for (let r = 0; r < roundsCount; r++) {
        const roundIds = [fixed, ...rotating];
        for (let i = 0; i < n / 2; i++) {
          const a = roundIds[i];
          const b = roundIds[n - 1 - i];
          if (a && b) {
            // Alternate who's "home" each round so it's not always the same side.
            const [homeId, awayId] = r % 2 === 0 ? [a, b] : [b, a];
            firstLegFixtures.push({ homeId, awayId, round: r + 1 });
          }
        }
        rotating.unshift(rotating.pop() as string | null);
      }

      // Second leg: same pairings, reversed home/away, continuing the matchday count.
      const secondLegFixtures: Fixture[] = firstLegFixtures.map((f) => ({
        homeId: f.awayId,
        awayId: f.homeId,
        round: f.round + roundsCount,
      }));

      const allFixtures = [...firstLegFixtures, ...secondLegFixtures];
      const nameById = new Map(teams.map((t) => [t.id, t.name]));

      const batch = writeBatch(db);
      allFixtures.forEach((f) => {
        const matchRef = doc(collection(db, "leagues", leagueId, "matches"));
        batch.set(matchRef, {
          leagueId,
          round: f.round,
          homeTeamId: f.homeId,
          homeTeamName: nameById.get(f.homeId) ?? "Unknown",
          awayTeamId: f.awayId,
          awayTeamName: nameById.get(f.awayId) ?? "Unknown",
          homeScore: null,
          awayScore: null,
          played: false,
          reportedBy: null,
          createdAt: serverTimestamp(),
        });
      });
      batch.update(doc(db, "leagues", leagueId), {
        started: true,
        // closed for good: the league is exactly the players who joined, even if it never filled up
        maxParticipants: teams.length,
        matchesCount: allFixtures.length,
      });
      await batch.commit();
      void callBot({ action: "league", leagueId, kind: "started" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league-matches", leagueId] });
    },
  });
}

/** Organiser sets (or clears) the start and end dates of one matchday; players hear about it from the bot. */
export function useSetMatchdayDate(leagueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ round, start, end }: { round: number; start: string; end: string }) => {
      const finish = start && (!end || end < start) ? start : end;
      await updateDoc(doc(db, "leagues", leagueId), {
        [`matchdayDates.${round}`]: start ? start : deleteField(),
        [`matchdayEnds.${round}`]: start && finish ? finish : deleteField(),
      });
      if (start) void callBot({ action: "league", leagueId, kind: "date", round });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["league", leagueId] }),
  });
}

const POINTS_FOR_WIN = 3;
const POINTS_FOR_DRAW = 1;

/** Reports the result of one already-scheduled fixture. */
export function useReportLeagueMatch(leagueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { matchId: string; homeScore: number; awayScore: number; reportedBy: string }) => {
      const matchRef = doc(db, "leagues", leagueId, "matches", input.matchId);
      const matchSnap = await getDoc(matchRef);
      if (!matchSnap.exists()) throw new Error("Fixture not found.");
      const match = matchSnap.data() as LeagueMatch;
      if (match.played) throw new Error("This fixture has already been reported.");

      const homeRef = doc(db, "leagues", leagueId, "teams", match.homeTeamId);
      const awayRef = doc(db, "leagues", leagueId, "teams", match.awayTeamId);

      const homeWon = input.homeScore > input.awayScore;
      const awayWon = input.awayScore > input.homeScore;
      const isDraw = input.homeScore === input.awayScore;

      await runTransaction(db, async (tx) => {
        tx.update(matchRef, {
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          played: true,
          reportedBy: input.reportedBy,
        });
        tx.update(homeRef, {
          goalsFor: increment(input.homeScore),
          goalsAgainst: increment(input.awayScore),
          wins: increment(homeWon ? 1 : 0),
          losses: increment(awayWon ? 1 : 0),
          draws: increment(isDraw ? 1 : 0),
          points: increment(homeWon ? POINTS_FOR_WIN : isDraw ? POINTS_FOR_DRAW : 0),
        });
        tx.update(awayRef, {
          goalsFor: increment(input.awayScore),
          goalsAgainst: increment(input.homeScore),
          wins: increment(awayWon ? 1 : 0),
          losses: increment(homeWon ? 1 : 0),
          draws: increment(isDraw ? 1 : 0),
          points: increment(awayWon ? POINTS_FOR_WIN : isDraw ? POINTS_FOR_DRAW : 0),
        });
      });

      // If every fixture is now played, the league is "successful" —
      // credit the organizer's rank-defining stat. Checked after the
      // transaction since it needs to see this match as played too.
      const [leagueSnap, allMatchesSnap] = await Promise.all([
        getDoc(doc(db, "leagues", leagueId)),
        getDocs(collection(db, "leagues", leagueId, "matches")),
      ]);
      if (leagueSnap.exists()) {
        const league = leagueSnap.data() as League;
        const playedCount = allMatchesSnap.docs.filter(
          (d) => d.id === input.matchId || (d.data().played as boolean)
        ).length;
        if (playedCount >= league.matchesCount && league.matchesCount > 0) {
          await updateDoc(doc(db, "users", league.creatorId), { successfulLeaguesOrganized: increment(1) });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league-teams", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league-matches", leagueId] });
    },
  });
}
