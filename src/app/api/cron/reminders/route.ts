import { NextResponse } from "next/server";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebaseAdmin";
import { sendToUids } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily "come back" reminder, run by Vercel Cron (see vercel.json).
 * Only runs when the request carries the CRON_SECRET Vercel adds, so nobody
 * else can trigger it. Skips people who were just in the app, and tells
 * players about the next upcoming tournament they haven't joined.
 * Phones that are offline get it when they reconnect (push is held ~24h).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!initAdmin()) return NextResponse.json({ ok: false, skipped: "not-configured" });

  const db = getFirestore();

  // Next tournament that hasn't started yet.
  const tSnap = await db.collection("tournaments").where("status", "==", "upcoming").limit(50).get();
  const now = Date.now();
  const upcoming = tSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((t) => (t.startsAt?.toMillis?.() ?? 0) > now)
    .sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());
  const featured = upcoming[0];

  // Players in a tournament that starts within 24 hours get a "starts today" reminder.
  const remindedIds = new Set<string>();
  for (const t of upcoming) {
    const startMs = t.startsAt.toMillis();
    if (startMs - now > 24 * 3600_000 || t.reminderSentAt) continue;
    const players: string[] = t.participantIds ?? [];
    if (!players.length) continue;
    const time = new Date(startMs).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
    const org = await db.collection("users").doc(t.organizerId).get();
    const o = org.data() ?? {};
    const fromUser = { uid: t.organizerId, username: o.username ?? "", displayName: o.displayName ?? "Organiser", photoURL: o.photoURL ?? null };
    const batch = db.batch();
    players.slice(0, 400).forEach((uid) => {
      batch.set(db.collection("notifications").doc(uid).collection("items").doc(), {
        type: "tournament_reminder",
        fromUid: t.organizerId,
        fromUser,
        tournamentId: t.id,
        tournamentTitle: t.title ?? "",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    batch.update(db.collection("tournaments").doc(t.id), { reminderSentAt: FieldValue.serverTimestamp() });
    await batch.commit();
    await sendToUids(players, {
      title: `🏆 ${t.title} starts at ${time} GMT`,
      body: "Be ready 10 minutes early. Good luck!",
      url: `/tournaments/${t.id}`,
      tag: `starts-${t.id}`,
    });
    remindedIds.add(t.id);
  }

  // Everyone who has a phone registered for alerts.
  const users = await db.collection("users").select("fcmTokens").limit(5000).get();
  let targets = users.docs.filter((u) => (u.data().fcmTokens ?? []).length > 0).map((u) => u.id);

  // Leave out people who were in the app in the last 3 hours.
  const recent = await db.collection("presence").where("lastActive", ">", Timestamp.fromMillis(now - 3 * 3600_000)).get();
  const recentIds = new Set(recent.docs.map((d) => d.id));
  targets = targets.filter((id) => !recentIds.has(id));

  let sent = 0;
  if (featured) {
    const joined = new Set<string>(featured.participantIds ?? []);
    const toTell = targets.filter((id) => !joined.has(id));
    const left = Math.max(0, (featured.maxParticipants ?? 0) - (featured.participantIds?.length ?? 0));
    const when = new Date(featured.startsAt.toMillis()).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
    await sendToUids(toTell, {
      title: `🏆 Join ${featured.title}`,
      body: `Starts ${when}${left ? ` · only ${left} spots left` : ""}. Don't miss out!`,
      url: `/tournaments/${featured.id}`,
      tag: "reminder-tournament",
    });
    sent += toTell.length;
    // Players already in get a nudge to come back instead (unless they just got the "starts today" reminder).
    const inAlready = remindedIds.has(featured.id) ? [] : targets.filter((id) => joined.has(id));
    if (inAlready.length) await sendToUids(inAlready, {
      title: "🎮 Your tournament is coming up",
      body: `${featured.title} starts ${when}. Get ready!`,
      url: `/tournaments/${featured.id}`,
      tag: "reminder-tournament-joined",
    });
    sent += inAlready.length;
  } else {
    await sendToUids(targets, {
      title: "🎮 Don't miss out on PlayConnect",
      body: "New plays, players and tournaments are waiting for you.",
      url: "/feed",
      tag: "reminder-general",
    });
    sent = targets.length;
  }

  return NextResponse.json({ ok: true, sent, featured: featured?.id ?? null });
}
