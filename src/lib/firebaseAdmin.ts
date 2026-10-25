import { cert, getApps, initializeApp } from "firebase-admin/app";

/** Initialises the Firebase Admin SDK from the FIREBASE_SERVICE_ACCOUNT env var. Returns false if it isn't set up. */
export function initAdmin(): boolean {
  if (getApps().length) return true;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return false;
  try {
    const json = JSON.parse(raw);
    if (typeof json.private_key === "string") json.private_key = json.private_key.replace(/\\n/g, "\n");
    initializeApp({ credential: cert(json) });
    return true;
  } catch {
    return false;
  }
}
