import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebaseAdmin";

/** Shared by the upload routes: who is asking, and may they upload into this folder? */

export function folderAllowed(folder: string, uid: string): boolean {
  if (!/^[A-Za-z0-9_\-/]+$/.test(folder) || folder.includes("..") || folder.length > 200) return false;
  const [root, a, b] = folder.split("/");
  if (root === "avatars" || root === "banners" || root === "posts" || root === "stories" || root === "shop") return a === uid;
  if (root === "messages") return !!a && a.includes(uid) && b === uid; // messages/{threadId}/{uid}
  if (root === "communities") return !!a;
  if (root === "tournaments") return !!a && b === uid; // tournaments/{id}/{uid} — membership checked in checkFolderAccess
  if (root === "leagues") return !!a && b === uid; // leagues/{id}/{uid} — participants only, checked in checkFolderAccess
  if (root === "ads") return a === uid; // also requires an admin account — checked in checkFolderAccess
  return false;
}

export type Denied = { error: string; status: number };

/** The signed-in user's uid from the Bearer token, or an error to send back. */
export async function uidFromRequest(req: Request): Promise<{ uid: string } | Denied> {
  if (!initAdmin()) return { error: "Uploads aren't set up yet (missing Firebase service account).", status: 503 };
  const auth = req.headers.get("authorization") ?? "";
  const idToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  try {
    return { uid: (await getAuth().verifyIdToken(idToken)).uid };
  } catch {
    return { error: "Please sign in again.", status: 401 };
  }
}

/** Full permission check for starting an upload into `requested` (a folder like "posts/<uid>/<id>"). */
export async function checkFolderAccess(uid: string, requested: string): Promise<Denied | null> {
  if (!folderAllowed(requested, uid)) return { error: "Not allowed to upload there.", status: 403 };

  if (requested.startsWith("tournaments/")) {
    // Only players who joined (or the organiser) may upload screenshots.
    const tid = requested.split("/")[1];
    const t = await getFirestore().doc(`tournaments/${tid}`).get();
    const d = t.data();
    if (!t.exists || !(d?.organizerId === uid || (d?.participantIds ?? []).includes(uid))) {
      return { error: "Only players in this tournament can add screenshots.", status: 403 };
    }
  }

  if (requested.startsWith("leagues/")) {
    const lid = requested.split("/")[1];
    const l = await getFirestore().doc(`leagues/${lid}`).get();
    const mine = await getFirestore().collection(`leagues/${lid}/teams`).where("memberIds", "array-contains", uid).limit(1).get();
    if (!l.exists || !(l.data()?.creatorId === uid || !mine.empty)) {
      return { error: "Only players in this league can add screenshots.", status: 403 };
    }
  }

  if (requested.startsWith("ads/")) {
    const me = await getFirestore().doc(`users/${uid}`).get();
    if (me.data()?.isAdmin !== true) return { error: "Only admins can upload ad images.", status: 403 };
  }
  return null;
}
