import { NextResponse } from "next/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebaseAdmin";
import { sendToUids } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Your match vs Kwame starts in 30 mins". Call this every ~5 minutes from a
 * free external scheduler (e.g. cron-job.org) with the header
 * Authorization: Bearer <CRON_SECRET>. Each tournament is only handled once.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!initAdmin()) return NextResponse.json({ ok: false, skipped: "not-configured" });

  const db = getFirestore();
  const now = Date.now();
  const snap = await db.collection("tournaments").where("status", "==", "upcoming").limit(50).get();
  let handled = 0;

  for (const d of snap.docs) {
    const t = d.data() as any;
    const startMs = t.startsAt?.toMillis?.() ?? 0;
    const diff = startMs - now;
    if (t.soonReminderSentAt || diff <= 0 || diff > 35 * 60_000) continue;
    const players: string[] = (t.participantIds ?? []).slice(0, 400);
    if (!players.length) continue;

    // Round-1 opponent for each player, if the draw has been made.
    const opponent: Record<string, string> = {};
    const matches = await db.collection(`tournaments/${d.id}/matches`).where("round", "==", 1).get();
    matches.docs.forEach((m) => {
      const x = m.data() as any;
      if (x.player1Id && x.player2Id) {
        opponent[x.player1Id] = x.player2?.displayName ?? "";
        opponent[x.player2Id] = x.player1?.displayName ?? "";
      }
    });

    const org = await db.collection("users").doc(t.organizerId).get();
    const o = org.data() ?? {};
    const fromUser = { uid: t.organizerId, username: o.username ?? "", displayName: o.displayName ?? "Organiser", photoURL: o.photoURL ?? null };
    const mins = Math.max(1, Math.round(diff / 60_000));

    await d.ref.update({ soonReminderSentAt: FieldValue.serverTimestamp() });
    const batch = db.batch();
    players.forEach((uid) => {
      batch.set(db.collection("notifications").doc(uid).collection("items").doc(), {
        type: "tournament_reminder",
        fromUid: t.organizerId,
        fromUser,
        tournamentId: d.id,
        tournamentTitle: t.title ?? "",
        read: false,
        pushed: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    const withOpp = players.filter((u) => opponent[u]);
    const without = players.filter((u) => !opponent[u]);
    for (const uid of withOpp) {
      await sendToUids([uid], {
        title: `Your match vs ${opponent[uid]} starts in ${mins} mins ⏰`,
        body: t.title ?? "Get ready!",
        url: `/tournaments/${d.id}`,
        tag: `soon-${d.id}`,
      });
    }
    if (without.length) {
      await sendToUids(without, {
        title: `${t.title ?? "Your tournament"} starts in ${mins} mins ⏰`,
        body: "Get ready!",
        url: `/tournaments/${d.id}`,
        tag: `soon-${d.id}`,
      });
    }
    handled++;
  }
  return NextResponse.json({ ok: true, handled });
}
