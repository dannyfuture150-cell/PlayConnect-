import { NextResponse } from "next/server";
import { initAdmin } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { sendToUids, type Payload } from "@/lib/pushServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends phone (web push) alerts. The app calls this right after something
 * happens (new like/comment/follow/message/live/announcement/trophy). The
 * caller can NOT choose the text: the server re-reads the real record from
 * Firestore, checks the caller is genuinely the person who triggered it,
 * and builds the message itself — so nobody can use this to spam arbitrary
 * pushes. Needs the FIREBASE_SERVICE_ACCOUNT env var on Vercel.
 */

const admin = initAdmin;

const NOTIF_COPY: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  tournament_invite: "invited you to a tournament",
  community_invite: "invited you to a community",
  result_submitted: "submitted a match result for you to review",
  result_approved: "approved your match result",
  result_rejected: "rejected your match result",
  match_ready: "— your next match is ready!",
  spot_open: "— a spot just opened in a tournament you wanted!",
  tournament_reminder: "— your tournament starts soon!",
  advanced: "— bracket updated!",
  result_reversed: "reversed a match result",
  mention: "mentioned you 💬",
};

function notifLink(type: string, n: any): string {
  if (typeof n.link === "string" && n.link.startsWith("/")) return n.link;
  if (type === "result_submitted" && n.tournamentId && !n.leagueId) return `/tournaments/${n.tournamentId}#results`;
  if (type === "follow") return n.fromUser?.username ? `/profile/${n.fromUser.username}` : "/notifications";
  if (n.leagueId && ["result_submitted", "result_approved", "result_rejected"].includes(type)) return `/leagues/${n.leagueId}`;
  if (n.tournamentId && ["result_submitted", "result_approved", "result_rejected", "match_ready", "spot_open", "tournament_reminder", "advanced", "result_reversed"].includes(type)) return `/tournaments/${n.tournamentId}`;
  if (type === "tournament_invite") return "/tournaments";
  if (type === "community_invite") return "/communities";
  if (type === "trophy_win" && n.tournamentId) return `/tournaments/${n.tournamentId}`;
  return n.postId ? "/feed" : "/notifications";
}

export async function POST(req: Request) {
  if (!admin()) return NextResponse.json({ ok: false, skipped: "not-configured" });

  const auth = req.headers.get("authorization") ?? "";
  const idToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  let callerUid: string;
  try {
    callerUid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const db = getFirestore();
  try {
    if (body.kind === "notification") {
      const ref = db.doc(`notifications/${body.toUid}/items/${body.notificationId}`);
      const snap = await ref.get();
      const n = snap.data();
      if (!n || n.fromUid !== callerUid || n.pushed) return NextResponse.json({ ok: false });
      const created = n.createdAt?.toMillis?.() ?? Date.now();
      if (Date.now() - created > 5 * 60_000) return NextResponse.json({ ok: false });
      await ref.update({ pushed: true });
      const name = n.fromUser?.displayName ?? "Someone";
      if (n.type === "trophy_win") {
        await sendToUids([body.toUid], {
          title: `🏆 You won ${n.tournamentTitle || "the tournament"}!`,
          body: n.prize ? `Prize: ${n.prize}` : "Congratulations, champion!",
          url: notifLink(n.type, n),
          tag: "trophy",
        });
      } else if (n.type === "advanced") {
        await sendToUids([body.toUid], {
          title: "Bracket updated 🔥",
          body: `You moved to the ${n.roundLabel || "next round"}${n.tournamentTitle ? ` in ${n.tournamentTitle}` : ""}`,
          url: notifLink(n.type, n),
          tag: `adv-${n.tournamentId}`,
        });
      } else {
        await sendToUids([body.toUid], {
          title: "PlayConnect",
          body: `${name} ${NOTIF_COPY[n.type] ?? "sent you an update"}`,
          url: notifLink(n.type, n),
          tag: `${n.type}-${n.postId ?? n.fromUid}`,
        });
      }
    } else if (body.kind === "message") {
      const thread = (await db.doc(`threads/${body.threadId}`).get()).data();
      const msgRef = db.doc(`threads/${body.threadId}/messages/${body.messageId}`);
      const msg = (await msgRef.get()).data();
      if (!thread || !msg || msg.senderId !== callerUid || msg.pushed) return NextResponse.json({ ok: false });
      if (!(thread.participantIds ?? []).includes(callerUid)) return NextResponse.json({ ok: false });
      const other = (thread.participantIds as string[]).find((id) => id !== callerUid);
      if (!other) return NextResponse.json({ ok: false });
      await msgRef.update({ pushed: true });
      const name = thread.participants?.[callerUid]?.displayName ?? "New message";
      const preview = msg.text || (msg.sticker ? "🎟️ Sticker" : msg.mediaType === "audio" ? "🎤 Voice note" : msg.mediaType === "video" ? "📹 Video" : msg.mediaType === "image" ? "📷 Photo" : "New message");
      await sendToUids([other], {
        title: name,
        body: String(preview).slice(0, 120),
        url: `/messages/${body.threadId}`,
        tag: `msg-${body.threadId}`,
      });
    } else if (body.kind === "live") {
      const ref = db.doc(`lives/${body.liveId}`);
      const live = (await ref.get()).data();
      if (!live || live.hostId !== callerUid || live.pushed) return NextResponse.json({ ok: false });
      await ref.update({ pushed: true });
      const followers = await db.collection(`followers/${callerUid}/list`).limit(500).get();
      await sendToUids(followers.docs.map((d) => d.id), {
        title: `🔴 ${live.host?.displayName ?? "Someone"} is live`,
        body: live.title ?? "Watch now",
        url: `/live/${body.liveId}`,
        tag: `live-${body.liveId}`,
      });
    } else if (body.kind === "post") {
      const ref = db.doc(`posts/${body.postId}`);
      const post = (await ref.get()).data();
      if (!post || post.authorId !== callerUid || post.pushed || post.mediaType !== "video") return NextResponse.json({ ok: false });
      await ref.update({ pushed: true });
      const followers = await db.collection(`followers/${callerUid}/list`).limit(500).get();
      await sendToUids(followers.docs.map((d) => d.id), {
        title: `🎬 ${post.author?.displayName ?? "Someone"} just posted a clip`,
        body: "You follow them — watch it now",
        url: "/feed",
        tag: `post-${body.postId}`,
      });
    } else if (body.kind === "announcement") {
      const community = (await db.doc(`communities/${body.communityId}`).get()).data();
      const aRef = db.doc(`communities/${body.communityId}/announcements/${body.announcementId}`);
      const a = (await aRef.get()).data();
      if (!community || !a || a.authorId !== callerUid || a.pushed) return NextResponse.json({ ok: false });
      if (!(community.moderatorIds ?? []).includes(callerUid)) return NextResponse.json({ ok: false });
      await aRef.update({ pushed: true });
      const members = ((community.memberIds ?? []) as string[]).filter((u) => u !== callerUid);
      await sendToUids(members, {
        title: community.name ?? "New announcement",
        body: String(a.text ?? "").slice(0, 120),
        url: `/communities/${community.slug}`,
        tag: `ann-${body.communityId}`,
      });
    } else {
      return NextResponse.json({ ok: false, error: "unknown-kind" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
