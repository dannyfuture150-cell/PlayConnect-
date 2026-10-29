import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { sendToUids } from "@/lib/pushServer";

/** The PlayConnect Bot's identity. It isn't a real account: its messages are notifications that show up in the bot chat. */
export const BOT = {
  uid: "playconnect-bot",
  username: "playconnectbot",
  displayName: "PlayConnect Bot 🤖",
  photoURL: null as string | null,
};

/**
 * Sends a message from the bot to one player (it appears in their bot chat and the bell list).
 * Returns false when the player has turned bot messages off in Settings. Server-side only.
 */
export async function botSay(
  db: Firestore,
  uid: string,
  msg: { text: string; link?: string; push?: { title: string; body: string; tag?: string } }
): Promise<boolean> {
  const u = await db.doc(`users/${uid}`).get();
  if (!u.exists || u.data()?.botMessagesOff === true) return false;
  await db.collection("notifications").doc(uid).collection("items").add({
    type: "bot",
    fromUid: BOT.uid,
    fromUser: BOT,
    text: msg.text.slice(0, 500),
    link: msg.link ?? null,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  if (msg.push) {
    await sendToUids([uid], { title: msg.push.title, body: msg.push.body, url: msg.link ?? "/messages/bot", tag: msg.push.tag }).catch(() => undefined);
  }
  return true;
}
