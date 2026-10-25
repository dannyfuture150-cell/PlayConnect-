"use client";

import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, firebaseApp } from "@/lib/firebase/client";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * Whether push notifications can even work in this browser. Some
 * browsers/contexts (Safari in some modes, non-HTTPS, older browsers)
 * don't support the Push API at all — better to check and hide the UI than
 * let someone tap "Enable" and get a confusing failure.
 */
export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const { isSupported } = await import("firebase/messaging");
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Requests notification permission, registers this device for push, and
 * saves the resulting token to the user's profile so the Cloud Function can
 * find it. Returns null (and does nothing further) if the person denies
 * permission — this is only ever called from an explicit "Enable" tap, never
 * automatically, since browsers penalize sites that auto-prompt.
 */
export async function enablePushNotifications(uid: string): Promise<{ ok: boolean; error?: string }> {
  if (!VAPID_KEY) {
    return { ok: false, error: "Push notifications aren't configured for this deployment (missing VAPID key)." };
  }

  const supported = await isPushSupported();
  if (!supported) {
    return { ok: false, error: "This browser doesn't support push notifications." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "Notification permission was denied." };
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const { getMessaging, getToken } = await import("firebase/messaging");
    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });

    if (!token) {
      return { ok: false, error: "Couldn't get a push token. Try again in a moment." };
    }

    await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message || "Something went wrong enabling notifications." };
  }
}

/** Removes this device's token so it stops receiving push notifications. */
export async function disablePushNotifications(uid: string): Promise<void> {
  if (!VAPID_KEY) return;
  try {
    const { getMessaging, getToken } = await import("firebase/messaging");
    const messaging = getMessaging(firebaseApp);
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) return;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (token) {
      await updateDoc(doc(db, "users", uid), { fcmTokens: arrayRemove(token) });
    }
  } catch {
    // Best-effort — if this fails the token just goes stale and the Cloud
    // Function will naturally stop being able to deliver to it.
  }
}

/** Current browser permission state, or null if push isn't supported at all. */
export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return Notification.permission;
}
