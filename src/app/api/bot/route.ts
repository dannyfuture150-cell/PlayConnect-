import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { botSay } from "@/lib/botServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Things the PlayConnect Bot says on its own.
 *   hello   -> welcome message for a brand-new player (once)
 *   matches -> an organiser's tournament changed: tell players whose next match is now ready (once per match)
 * The caller never chooses the text; the server builds it from real records.
 */

const ms = (v: unknown) => (v as { toMillis?: () => number } | null | undefined)?.toMillis?.() ?? 0;
const NEW_PLAYER_MS = 7 * 86400000;

function roundLabel(round: number, total: number) {
  if (round === total) return "the final";
  if (round === total - 1) return "a semifinal";
  if (round === total - 2) return "a quarterfinal";
  return `round ${round}`;
}

async function hello(db: Firestore, uid: string) {
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) return { ok: true };
  const u = snap.data() ?? {};
  if (u.botWelcomedAt) return { ok: true, already: true };
  await ref.update({ botWelcomedAt: FieldValue.serverTimestamp() });
  // only people who really just signed up get a welcome (existing players are quietly marked)
  if (Date.now() - ms(u.createdAt) > NEW_PLAYER_MS) return { ok: true, skipped: true };
  const first = String(u.displayName ?? "").split(" ")[0] || "there";
  await botSay(db, uid, {
    text: `Welcome to PlayConnect, ${first}! 🎮 A quick start: add your game ID in Settings, tap Play 1v1 Now on the feed for an instant match, and join a tournament from the Tournaments tab. Ask me anything in this chat whenever you're stuck.`,
    link: "/messages/bot",
    push: { title: "Welcome to PlayConnect 🎮", body: "Tap to see how to get started" },
  });
  return { ok: true, sent: true };
}

async function matchesReady(db: Firestore, uid: string, tournamentId: string) {
  const tRef = db.doc(`tournaments/${tournamentId}`);
  const t = (await tRef.get()).data();
  if (!t) return { ok: false, error: "Tournament not found." };
  let allowed = t.organizerId === uid;
  if (!allowed) allowed = (await db.doc(`users/${uid}`).get()).data()?.isAdmin === true;
  if (!allowed) return { ok: false, error: "Not allowed." };

  const all = await tRef.collection("matches").get();
  const matches = all.docs.map((d) => ({ ref: d.ref, id: d.id, ...(d.data() as Record<string, any>) }));
  const totalRounds = Math.max(1, ...matches.map((m) => Number(m.round) || 1));
  let told = 0;
  for (const m of matches) {
    if (!m.player1Id || !m.player2Id || m.winnerId || m.isBye || m.botNotified) continue;
    // claim the match first so two quick calls can't both send
    const claimed = await db.runTransaction(async (tx) => {
      const cur = await tx.get(m.ref);
      if (!cur.exists || cur.data()?.botNotified) return false;
      tx.update(m.ref, { botNotified: true });
      return true;
    });
    if (!claimed) continue;
    const label = roundLabel(Number(m.round) || 1, totalRounds);
    const pairs: [string, string][] = [
      [m.player1Id, m.player2?.displayName ?? "your opponent"],
      [m.player2Id, m.player1?.displayName ?? "your opponent"],
    ];
    for (const [pid, opp] of pairs) {
      const ok = await botSay(db, pid, {
        text: `Your match in ${t.title ?? "your tournament"} is ready: you vs ${opp} (${label}). Open the tournament to find their game ID, play your match, then submit the score.`,
        link: `/tournaments/${tournamentId}`,
        push: { title: "🎮 Your match is ready", body: `vs ${opp} · ${t.title ?? "tournament"}`, tag: `match-${m.id}` },
      }).catch(() => false);
      if (ok) told++;
    }
  }
  return { ok: true, told };
}

export async function POST(req: Request) {
  if (!initAdmin()) return NextResponse.json({ ok: false, error: "not-configured" }, { status: 503 });
  const header = req.headers.get("authorization") ?? "";
  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(header.startsWith("Bearer ") ? header.slice(7) : "")).uid;
  } catch {
    return NextResponse.json({ ok: false, error: "Please sign in again." }, { status: 401 });
  }
  let body: { action?: string; tournamentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const db = getFirestore();
  try {
    if (body.action === "hello") return NextResponse.json(await hello(db, uid));
    if (body.action === "matches" && body.tournamentId) return NextResponse.json(await matchesReady(db, uid, String(body.tournamentId)));
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const e = err as { code?: unknown; message?: string };
    console.error("[bot] failed:", e?.code, e?.message);
    return NextResponse.json({ ok: false, error: "Bot is resting. Try later." }, { status: 500 });
  }
}
