import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isBrowser = typeof window !== "undefined";
const requiredKeys: (keyof FirebaseOptions)[] = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];
const missingKeys = requiredKeys.filter((k) => !firebaseConfig[k]);

/**
 * `firebaseInitError` is the single source of truth the UI checks before
 * calling any Firebase API. IMPORTANT: nothing in this module is allowed to
 * throw at import/module-evaluation time — a throw here happens before React
 * even mounts, so no error boundary (error.tsx / global-error.tsx) can catch
 * it, and the page just goes blank with no message. Every risky call below
 * is wrapped in try/catch specifically to prevent that.
 */
export let firebaseInitError: string | null =
  missingKeys.length > 0
    ? `Missing Firebase env var${missingKeys.length > 1 ? "s" : ""}: ${missingKeys
        .map((k) => `NEXT_PUBLIC_FIREBASE_${k.replace(/([A-Z])/g, "_$1").toUpperCase()}`)
        .join(", ")}. Set these in Vercel → Project Settings → Environment Variables, then redeploy.`
    : null;

if (isBrowser && firebaseInitError) {
  console.warn(`[PlayConnect] ${firebaseInitError}`);
}

let _app: ReturnType<typeof initializeApp> | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

try {
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (err) {
  firebaseInitError = firebaseInitError ?? `Firebase app failed to initialize: ${(err as Error).message}`;
}

// Only touch Auth/Firestore/Storage in the browser — these SDKs rely on
// browser-only APIs (indexedDB, etc.) and can throw during Next.js's
// server-side prerendering step, failing the build entirely.
if (isBrowser && _app) {
  try {
    // Keep people signed in: try IndexedDB first, then localStorage, so a
    // closed/reopened app (or a phone that clears one of them) stays logged in.
    try {
      _auth = initializeAuth(_app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    } catch {
      _auth = getAuth(_app); // already initialised (e.g. hot reload)
    }
  } catch (err) {
    firebaseInitError = firebaseInitError ?? `Firebase Auth failed to initialize: ${(err as Error).message}`;
  }
  try {
    _db = getFirestore(_app);
  } catch (err) {
    firebaseInitError = firebaseInitError ?? `Firestore failed to initialize: ${(err as Error).message}`;
  }
  try {
    _storage = getStorage(_app);
  } catch (err) {
    firebaseInitError = firebaseInitError ?? `Firebase Storage failed to initialize: ${(err as Error).message}`;
  }
}

// Exported as non-null so existing call sites (getAuth(auth, ...) etc.)
// still type-check; if init actually failed, `firebaseInitError` is set and
// the UI (see FirebaseConfigGate) shows a clear message instead of ever
// calling these, so the {} fallback is never exercised in practice.
export const firebaseApp = _app as ReturnType<typeof initializeApp>;
export const auth = (_auth ?? {}) as Auth;
export const db = (_db ?? {}) as Firestore;
export const storage = (_storage ?? {}) as FirebaseStorage;
export const googleProvider = new GoogleAuthProvider();
