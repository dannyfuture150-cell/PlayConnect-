import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gives a signed-in user a short-lived signature to upload ONE file to
 * Cloudinary, restricted to their own folders. The Cloudinary secret never
 * leaves the server, and nobody can upload without being signed in.
 */
function folderAllowed(folder: string, uid: string): boolean {
  if (!/^[A-Za-z0-9_\-/]+$/.test(folder) || folder.includes("..") || folder.length > 200) return false;
  const [root, a, b] = folder.split("/");
  if (root === "avatars" || root === "banners" || root === "posts" || root === "stories" || root === "shop") return a === uid;
  if (root === "messages") return !!a && a.includes(uid) && b === uid; // messages/{threadId}/{uid}
  if (root === "communities") return !!a;
  if (root === "tournaments") return !!a && b === uid; // tournaments/{id}/{uid} — membership checked in POST
  if (root === "leagues") return !!a && b === uid; // leagues/{id}/{uid} — participants only, checked in POST
  if (root === "ads") return a === uid; // also requires an admin account — checked in POST
  return false;
}

export async function POST(req: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ ok: false, error: "Uploads aren't set up yet (missing Cloudinary keys)." }, { status: 503 });
  }
  if (!initAdmin()) {
    return NextResponse.json({ ok: false, error: "Uploads aren't set up yet (missing Firebase service account)." }, { status: 503 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const idToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ ok: false, error: "Please sign in again." }, { status: 401 });
  }

  let body: { folder?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const requested = String(body.folder ?? "").replace(/^\/+|\/+$/g, "");
  if (!folderAllowed(requested, uid)) {
    return NextResponse.json({ ok: false, error: "Not allowed to upload there." }, { status: 403 });
  }

  if (requested.startsWith("tournaments/")) {
    // Only players who joined (or the organiser) may upload screenshots.
    const tid = requested.split("/")[1];
    const t = await getFirestore().doc(`tournaments/${tid}`).get();
    const d = t.data();
    if (!t.exists || !(d?.organizerId === uid || (d?.participantIds ?? []).includes(uid))) {
      return NextResponse.json({ ok: false, error: "Only players in this tournament can add screenshots." }, { status: 403 });
    }
  }

  if (requested.startsWith("leagues/")) {
    const lid = requested.split("/")[1];
    const l = await getFirestore().doc(`leagues/${lid}`).get();
    const mine = await getFirestore().collection(`leagues/${lid}/teams`).where("memberIds", "array-contains", uid).limit(1).get();
    if (!l.exists || !(l.data()?.creatorId === uid || !mine.empty)) {
      return NextResponse.json({ ok: false, error: "Only players in this league can add screenshots." }, { status: 403 });
    }
  }

  if (requested.startsWith("ads/")) {
    const me = await getFirestore().doc(`users/${uid}`).get();
    if (me.data()?.isAdmin !== true) {
      return NextResponse.json({ ok: false, error: "Only admins can upload ad images." }, { status: 403 });
    }
  }

  const folder = `playconnect/${requested}`;
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signs the alphabetically-sorted params (excluding file/api_key/resource_type) + secret.
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");

  return NextResponse.json({ ok: true, cloudName, apiKey, timestamp, signature, folder });
}
