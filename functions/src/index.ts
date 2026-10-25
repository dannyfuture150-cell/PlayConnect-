import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";

initializeApp();

const COPY: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  message: "sent you a message",
  tournament_invite: "invited you to a tournament",
  community_invite: "invited you to a community",
};

function linkFor(type: string): string {
  if (type === "follow") return "/notifications";
  if (type === "tournament_invite") return "/tournaments";
  if (type === "community_invite") return "/communities";
  if (type === "message") return "/messages";
  return "/feed";
}

/**
 * Fires every time a new doc lands in notifications/{uid}/items — which
 * already happens today whenever someone likes, comments, follows, or
 * messages (see src/hooks/useNotifications.ts createNotification on the
 * client). This function is the piece that turns that in-app notification
 * into an actual push, delivered to every device the target user has
 * opted into (Settings → Notifications → Enable).
 */
/**
 * The client already hides expired stories from the feed (the query
 * filters on expiresAt), so "vanishing after 24 hours" is already true
 * from any user's point of view. What this function does is the other
 * half of that: actually delete the Firestore doc and its Storage file
 * once a story expires, instead of letting them sit invisibly forever and
 * quietly use up storage. Runs once a day.
 */
export const cleanupExpiredStories = onSchedule("every 24 hours", async () => {
  const db = getFirestore();
  const now = Timestamp.now();
  const expiredSnap = await db.collection("stories").where("expiresAt", "<=", now).get();

  if (expiredSnap.empty) return;

  const bucket = getStorage().bucket();
  await Promise.all(
    expiredSnap.docs.map(async (docSnap) => {
      const storagePath = docSnap.data().storagePath as string | null;
      if (storagePath) {
        // Best-effort — if the file's already gone for any reason, don't
        // let that block deleting the Firestore doc too.
        await bucket.file(storagePath).delete().catch(() => undefined);
      }
      await docSnap.ref.delete();
    })
  );
});

export const sendPushOnNotification = onDocumentCreated(
  "notifications/{uid}/items/{notificationId}",
  async (event) => {
    const notification = event.data?.data();
    const uid = event.params.uid;
    if (!notification) return;

    const db = getFirestore();
    const userSnap = await db.collection("users").doc(uid).get();
    const tokens: string[] = userSnap.data()?.fcmTokens ?? [];
    if (tokens.length === 0) return;

    const fromName = notification.fromUser?.displayName ?? "Someone";
    const body = COPY[notification.type] ?? "sent you an update";
    const url = linkFor(notification.type);

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: `${fromName} ${body}`,
        body: "Tap to open PlayConnect",
      },
      data: { url },
      webpush: {
        fcmOptions: { link: url },
      },
    });

    // Clean up tokens that are no longer valid (uninstalled, permission
    // revoked, etc.) so this list doesn't grow stale forever.
    const deadTokens: string[] = [];
    response.responses.forEach((result, i) => {
      if (
        !result.success &&
        (result.error?.code === "messaging/registration-token-not-registered" ||
          result.error?.code === "messaging/invalid-registration-token")
      ) {
        deadTokens.push(tokens[i]);
      }
    });

    if (deadTokens.length > 0) {
      await db.collection("users").doc(uid).update({
        fcmTokens: FieldValue.arrayRemove(...deadTokens),
      });
    }
  }
);
