import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * "Play 1v1 Now": a waiting room that pairs two players who want a game right now.
 * The server does the pairing (in a transaction, so two people can never be matched to the same
 * opponent) and creates an ordinary 1v1 challenge that is already accepted. Quick matches use the
 * existing result flow (one says who won, the other confirms) but never pay PlayCoins, so they can't be farmed.
 *   join  -> enter the waiting room (or resume a match that is already running)
 *   poll  -> called every few seconds while waiting; keeps your place and looks for an opponent
 *   leave -> leave the waiting room
 */

const GAMES = ["eFootball", "EA FC", "Mortal Kombat"];
const MAX_WAIT_MS = 5 * 60_000; // give up after 5 minutes
const ALIVE_MS = 25_000; // a waiting player must have polled in the last 25s, so we never pair with someone who left
const RESUME_MS = 45 * 60_000; // a running quick match is resumed for 45 minutes

const ms = (v: unknown) => (v as { toMillis?: () => number } | null | undefined)?.toMillis?.() ?? 0;

async function snapshotOf(db: Firestore, uid: string) {
  const d = await db.doc(`users/${uid}`).get();
  if (!d.exists) return null;
  const x = d.data() ?? {};
  return { uid, username: String(x.username ?? ""), displayName: String(x.displayName ?? "Player"), photoURL: (x.photoURL as string | null) ?? null };
}

/** A quick match this player is already in (accepted or waiting on a result confirmation). */
async function runningMatch(db: Firestore, uid: string): Promise<string | null> {
  const snap = await db.collection("challenges").where("participantIds", "array-contains", uid).limit(30).get();
  const now = Date.now();
  const hit = snap.docs
    .filter((d) => {
      const c = d.data();
      return c.quick === true && (c.status === "accepted" || c.status === "reported") && now - ms(c.createdAt) < RESUME_MS;
    })
    .sort((a, b) => ms(b.data().createdAt) - ms(a.data().createdAt))[0];
  return hit ? hit.id : null;
}

async function tryPair(db: Firestore, uid: string, game: string): Promise<string | null> {
  const cands = await db.collection("quickQueue").where("game", "==", game).limit(25).get();
  const now = Date.now();
  const ready = cands.docs
    .filter((d) => d.id !== uid && !d.data().matchId && ms(d.data().lastPing) > now - ALIVE_MS)
    .sort((a, b) => ms(a.data().joinedAt) - ms(b.data().joinedAt));
  const myRef = db.doc(`quickQueue/${uid}`);
  for (const c of ready) {
    const [waiter, me] = await Promise.all([snapshotOf(db, c.id), snapshotOf(db, uid)]);
    if (!waiter || !me) continue;
    const chRef = db.collection("challenges").doc();
    const ok = await db.runTransaction(async (tx) => {
      const [cs, ms2] = await Promise.all([tx.get(c.ref), tx.get(myRef)]);
      if (!cs.exists || cs.data()?.matchId) return false;
      if (ms2.exists && ms2.data()?.matchId) return false;
      tx.set(chRef, {
        challengerId: waiter.uid,
        challenger: waiter,
        opponentId: me.uid,
        opponent: me,
        participantIds: [waiter.uid, me.uid],
        game,
        bestOf: 1,
        note: "Quick match",
        status: "accepted",
        quick: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(c.ref, { matchId: chRef.id, matchedAt: FieldValue.serverTimestamp() });
      if (ms2.exists) tx.delete(myRef);
      return true;
    });
    if (ok) {
      // Let the waiting player know even if the app is in their pocket.
      db.collection("notifications").doc(waiter.uid).collection("items").add({
        type: "challenge",
        fromUid: me.uid,
        fromUser: me,
        postId: null,
        communityId: null,
        tournamentId: null,
        leagueId: null,
        link: "/my",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => undefined);
      return chRef.id;
    }
  }
  return null;
}

export async function POST(req: Request) {
  if (!initAdmin()) return NextResponse.json({ ok: false, error: "Quick matches aren't set up on the server yet." }, { status: 503 });
  const header = req.headers.get("authorization") ?? "";
  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(header.startsWith("Bearer ") ? header.slice(7) : "")).uid;
  } catch {
    return NextResponse.json({ ok: false, error: "Please sign in again." }, { status: 401 });
  }
  let body: { action?: string; game?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const db = getFirestore();
  const myRef = db.doc(`quickQueue/${uid}`);

  try {
    if (body.action === "leave") {
      await myRef.delete().catch(() => undefined);
      return NextResponse.json({ ok: true, state: "idle" });
    }

    if (body.action === "join") {
      const game = String(body.game ?? "");
      if (!GAMES.includes(game)) return NextResponse.json({ ok: false, error: "Pick a game first." });
      const running = await runningMatch(db, uid);
      if (running) {
        await myRef.delete().catch(() => undefined);
        return NextResponse.json({ ok: true, state: "matched", challengeId: running });
      }
      const matchId = await tryPair(db, uid, game);
      if (matchId) return NextResponse.json({ ok: true, state: "matched", challengeId: matchId });
      await myRef.set({ uid, game, joinedAt: FieldValue.serverTimestamp(), lastPing: FieldValue.serverTimestamp() });
      return NextResponse.json({ ok: true, state: "waiting" });
    }

    if (body.action === "poll") {
      const mine = await myRef.get();
      if (!mine.exists) return NextResponse.json({ ok: true, state: "idle" });
      const d = mine.data() ?? {};
      if (d.matchId) {
        await myRef.delete().catch(() => undefined);
        return NextResponse.json({ ok: true, state: "matched", challengeId: d.matchId });
      }
      if (Date.now() - ms(d.joinedAt) > MAX_WAIT_MS) {
        await myRef.delete().catch(() => undefined);
        return NextResponse.json({ ok: true, state: "expired" });
      }
      const matchId = await tryPair(db, uid, String(d.game));
      if (matchId) return NextResponse.json({ ok: true, state: "matched", challengeId: matchId });
      await myRef.update({ lastPing: FieldValue.serverTimestamp() }).catch(() => undefined);
      return NextResponse.json({ ok: true, state: "waiting" });
    }

    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const e = err as { code?: unknown; message?: string };
    console.error("[quick] failed:", e?.code, e?.message);
    return NextResponse.json({ ok: false, error: "Couldn't reach the waiting room. Try again." }, { status: 500 });
  }
}
