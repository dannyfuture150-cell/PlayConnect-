import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

export interface Payload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** Sends a data-only web push to every registered device of the given users; prunes dead tokens. */
export async function sendToUids(uids: string[], payload: Payload) {
  const db = getFirestore();
  const unique = Array.from(new Set(uids)).slice(0, 500);
  if (unique.length === 0) return;
  const refs = unique.map((u) => db.collection("users").doc(u));
  const snaps = await db.getAll(...refs);
  const tokenOwner = new Map<string, string>();
  snaps.forEach((s) => {
    const tokens: string[] = (s.exists && s.data()?.fcmTokens) || [];
    tokens.forEach((t) => tokenOwner.set(t, s.id));
  });
  const tokens = Array.from(tokenOwner.keys());
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const res = await getMessaging().sendEachForMulticast({
      tokens: chunk,
      // data-only: the service worker builds the visible notification
      data: { title: payload.title, body: payload.body, url: payload.url, tag: payload.tag ?? "" },
      webpush: { headers: { Urgency: "high", TTL: "86400" } },
      android: { priority: "high" },
    });
    const dead: Record<string, string[]> = {};
    res.responses.forEach((r, idx) => {
      const code = r.error?.code;
      if (!r.success && (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token")) {
        const owner = tokenOwner.get(chunk[idx]);
        if (owner) (dead[owner] ||= []).push(chunk[idx]);
      }
    });
    await Promise.all(
      Object.entries(dead).map(([owner, list]) =>
        db.collection("users").doc(owner).update({ fcmTokens: FieldValue.arrayRemove(...list) }).catch(() => undefined)
      )
    );
  }
}
