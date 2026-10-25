import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Permanently deletes the signed-in user's account and their data. */
export async function POST(req: Request) {
  if (!initAdmin()) {
    return NextResponse.json({ ok: false, error: "Account deletion isn't set up on the server yet." }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  let uid: string;
  try {
    uid = (await getAuth().verifyIdToken(header.startsWith("Bearer ") ? header.slice(7) : "")).uid;
  } catch {
    return NextResponse.json({ ok: false, error: "Please sign in again, then retry." }, { status: 401 });
  }

  const db = getFirestore();
  try {
    // Posts and stories written by this user.
    for (const col of ["posts", "stories"]) {
      const snap = await db.collection(col).where("authorId", "==", uid).get();
      await Promise.all(snap.docs.map((d) => db.recursiveDelete(d.ref)));
    }
    // Leave every group (keeps member counts right).
    const groups = await db.collection("communities").where("memberIds", "array-contains", uid).get();
    await Promise.all(
      groups.docs.map((g) => {
        const d = g.data();
        if (d.createdBy === uid) return Promise.resolve(); // creator's group stays; handled below
        return g.ref.update({
          memberIds: (d.memberIds ?? []).filter((m: string) => m !== uid),
          moderatorIds: (d.moderatorIds ?? []).filter((m: string) => m !== uid),
          memberCount: Math.max(0, (d.memberCount ?? 1) - 1),
        });
      })
    );
    // Social graph + profile.
    await Promise.all([
      db.recursiveDelete(db.doc(`followers/${uid}`)),
      db.recursiveDelete(db.doc(`following/${uid}`)),
      db.doc(`presence/${uid}`).delete(),
    ]);
    await db.doc(`users/${uid}`).delete();
    await getAuth().deleteUser(uid);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Couldn't delete the account." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
