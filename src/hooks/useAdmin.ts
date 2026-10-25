"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, orderBy, query, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { canonicalGame } from "@/lib/leaderboardGames";
import { db } from "@/lib/firebase/client";
import type { AccountType, League, Post, Report, SkillLevel, Tournament, UserProfile } from "@/types";

/** All users, newest-joined first — filtering/searching happens client-side since this is an admin tool, not a public-scale query. */
export function useAdminUsers() {
  return useQuery<UserProfile[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(500)));
      return snap.docs.map((d) => d.data() as UserProfile);
    },
  });
}

/** Platform-wide counts + recent activity for the admin dashboard. */
export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [usersSnap, postsSnap, reportsSnap, tournamentsSnap, leaguesSnap, communitiesSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "posts")),
        getDocs(collection(db, "reports")),
        getDocs(collection(db, "tournaments")),
        getDocs(collection(db, "leagues")),
        getDocs(collection(db, "communities")),
      ]);

      const users = usersSnap.docs.map((d) => d.data() as UserProfile);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const created = (u: UserProfile) => (u.createdAt as any)?.toMillis?.() ?? 0;
      const posts = postsSnap.docs.map((d) => d.data() as Post);
      const postTime = (p: Post) => (p.createdAt as any)?.toMillis?.() ?? 0;

      return {
        totalUsers: usersSnap.size,
        newUsers7d: users.filter((u) => created(u) > weekAgo).length,
        organisers: users.filter((u) => u.accountType === "organizer").length,
        bannedUsers: users.filter((u) => u.isBanned).length,
        totalPosts: postsSnap.size,
        posts24h: posts.filter((p) => postTime(p) > dayAgo).length,
        openReports: reportsSnap.docs.filter((d) => d.data().status === "open").length,
        totalTournaments: tournamentsSnap.size,
        totalLeagues: leaguesSnap.size,
        totalCommunities: communitiesSnap.size,
        recentUsers: [...users].sort((a, b) => created(b) - created(a)).slice(0, 5),
      };
    },
  });
}

/** Admin-only (enforced by Firestore rules): suspend or restore an account. */
export function useSetUserBanned() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uid: string; banned: boolean }) => {
      await updateDoc(doc(db, "users", input.uid), { isBanned: input.banned });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

/**
 * Admin-only: permanently deletes a user's profile document.
 *
 * Important limitation: this removes their PlayConnect profile and frees up
 * their username, but it can NOT delete their underlying Firebase
 * Authentication account — the client SDK has no permission to delete
 * another user's login, only a Cloud Function with the Admin SDK can do
 * that. In practice this means the person could technically still sign in,
 * but would be sent straight back through onboarding with no history,
 * followers, or posts. For actually blocking someone from the app, Ban is
 * the correct and complete action — Delete is for permanently wiping a
 * profile's data, not revoking their login.
 */
export function useDeleteUserAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uid: string; username: string }) => {
      await deleteDoc(doc(db, "users", input.uid));
      if (input.username) await deleteDoc(doc(db, "usernames", input.username)).catch(() => undefined);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

/** Latest posts across the platform for moderation. */
export function useAdminPosts() {
  return useQuery<Post[]>({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(200)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
    },
  });
}

export function useAdminTournaments() {
  return useQuery<Tournament[]>({
    queryKey: ["admin-tournaments"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "tournaments"), orderBy("createdAt", "desc"), limit(200)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tournament));
    },
  });
}

export function useAdminLeagues() {
  return useQuery<League[]>({
    queryKey: ["admin-leagues"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "leagues"), orderBy("createdAt", "desc"), limit(200)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as League));
    },
  });
}

export function useAdminReports() {
  return useQuery<Report[]>({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(200)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report));
    },
  });
}

export function useSetReportStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: Report["status"] }) => {
      await updateDoc(doc(db, "reports", input.id), { status: input.status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

/** Admin-only: change someone's account type (the sign-up lock doesn't apply to admins). */
export function useSetAccountType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uid: string; accountType: AccountType }) => {
      await updateDoc(doc(db, "users", input.uid), { accountType: input.accountType });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

/** Any signed-in user: report a post (shows up in Admin → Reports). */
export async function reportPost(input: { reporterId: string; postId: string; reason: string }) {
  await addDoc(collection(db, "reports"), {
    reporterId: input.reporterId,
    targetType: "post",
    targetId: input.postId,
    reason: input.reason,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

/** Any signed-in user: report a story (shows up in Admin → Reports). */
export async function reportStory(input: { reporterId: string; storyId: string; authorId: string; reason: string }) {
  await addDoc(collection(db, "reports"), {
    reporterId: input.reporterId,
    targetType: "story",
    targetId: input.storyId,
    targetUid: input.authorId,
    reason: input.reason,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

/** Any signed-in user: report another user (shows up in Admin → Reports). */
export async function reportUser(input: { reporterId: string; userId: string; reason: string }) {
  await addDoc(collection(db, "reports"), {
    reporterId: input.reporterId,
    targetType: "user",
    targetId: input.userId,
    reason: input.reason,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

/** A tournament winner reports the organiser for not paying the prize (shows up in Admin → Reports). */
export async function reportOrganizer(input: {
  reporterId: string;
  organizerId: string;
  tournamentId: string;
  tournamentTitle: string;
  prize: string | null;
  note: string;
}) {
  await addDoc(collection(db, "reports"), {
    reporterId: input.reporterId,
    targetType: "organizer",
    targetId: input.organizerId,
    tournamentId: input.tournamentId,
    tournamentTitle: input.tournamentTitle,
    prize: input.prize,
    reason: input.note.trim().slice(0, 300) || "Prize not received",
    status: "open",
    createdAt: serverTimestamp(),
  });
}

/** Admin: add or remove a badge on a player. */
export function useAdminBadge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uid: string; badge: string; remove?: boolean }) => {
      const badge = input.badge.trim().slice(0, 40);
      if (!badge) throw new Error("Type a badge first.");
      await updateDoc(doc(db, "users", input.uid), { badges: input.remove ? arrayRemove(badge) : arrayUnion(badge) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

/** Admin: set a player's rank by hand (null goes back to the automatic rank). */
export function useAdminSetRank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { uid: string; rank: SkillLevel | null }) => {
      await updateDoc(doc(db, "users", input.uid), { rankOverride: input.rank });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

/**
 * Admin: make a player the winner of a tournament. Marks it completed, gives
 * the winner +1 win (and the Champion badge), sends them the trophy popup,
 * and — if there was already a different winner — takes the win back from them.
 */
export function useAdminSetWinner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { tournament: Tournament; winnerUid: string }) => {
      const t = input.tournament;
      if (t.winnerId === input.winnerUid) throw new Error("They are already the winner.");
      const winSnap = await getDoc(doc(db, "users", input.winnerUid));
      if (!winSnap.exists()) throw new Error("Player not found.");
      const w = winSnap.data() as UserProfile;
      const batch = writeBatch(db);
      const game = canonicalGame(t.game);

      batch.update(doc(db, "tournaments", t.id), { status: "completed", winnerId: input.winnerUid, prizeConfirmed: false });
      batch.update(doc(db, "users", input.winnerUid), {
        tournamentWins: increment(1),
        [`gameWins.${game}`]: increment(1),
        badges: arrayUnion("🏆 Tournament Champion"),
      });
      if (t.winnerId) {
        batch.update(doc(db, "users", t.winnerId), { tournamentWins: increment(-1), [`gameWins.${game}`]: increment(-1) });
      } else {
        // First time this tournament gets a champion: the organiser's event counts as completed.
        batch.update(doc(db, "users", t.organizerId), { successfulTournamentsOrganized: increment(1) });
      }
      batch.set(doc(collection(db, "notifications", input.winnerUid, "items")), {
        type: "trophy_win",
        fromUid: t.organizerId,
        fromUser: { uid: w.uid, username: w.username, displayName: w.displayName, photoURL: w.photoURL ?? null },
        tournamentId: t.id,
        tournamentTitle: t.title,
        prize: t.prize ?? null,
        game,
        read: false,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
}
