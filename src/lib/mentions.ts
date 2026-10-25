import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { createNotification } from "@/hooks/useNotifications";
import type { PostAuthorSnapshot } from "@/types";

/** @username — letters, numbers and underscore, not glued to a word (so emails don't count). */
export function extractMentions(text: string): string[] {
  const re = /(^|[^\w@])@([a-z0-9_]{2,20})/gi;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(m[2].toLowerCase());
  return Array.from(out).slice(0, 5);
}

/**
 * Tells everyone @tagged in `text` that they were mentioned. Best-effort: never
 * throws. `onlyUids` limits who can be notified (e.g. members of a group);
 * `skipUids` are people who already got another notification for this action.
 */
export async function notifyMentions(opts: {
  text: string;
  from: PostAuthorSnapshot;
  postId?: string;
  link?: string;
  onlyUids?: string[];
  skipUids?: string[];
}) {
  try {
    const names = extractMentions(opts.text);
    for (const name of names) {
      const snap = await getDocs(query(collection(db, "users"), where("username", "==", name), limit(1)));
      const uid = snap.docs[0]?.id;
      if (!uid || uid === opts.from.uid) continue;
      if (opts.onlyUids && !opts.onlyUids.includes(uid)) continue;
      if (opts.skipUids?.includes(uid)) continue;
      await createNotification({ toUid: uid, type: "mention", fromUser: opts.from, postId: opts.postId, link: opts.link });
    }
  } catch {
    // mentions are a bonus — never block posting or sending
  }
}

/** Per-screen unsent text, remembered on this phone. */
export function readDraft(key: string): string {
  try {
    return (typeof window !== "undefined" && localStorage.getItem(`pc-draft:${key}`)) || "";
  } catch {
    return "";
  }
}
export function writeDraft(key: string, value: string) {
  try {
    if (value) localStorage.setItem(`pc-draft:${key}`, value);
    else localStorage.removeItem(`pc-draft:${key}`);
  } catch {}
}
