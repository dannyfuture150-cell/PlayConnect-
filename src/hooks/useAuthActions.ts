"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase/client";

/** Maps Firebase Auth error codes to friendly, actionable copy. */
function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/invalid-email":
      return "That email address looks invalid.";
    case "auth/weak-password":
      return "Choose a stronger password.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before finishing.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    case "auth/unauthorized-domain":
      return "This domain isn't authorized in Firebase — add it under Authentication → Settings → Authorized domains.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      // Show the real code instead of a generic message — a silent
      // "something went wrong" for an unrecognized error just hides the one
      // piece of information that would actually let us fix it.
      return code ? `Something went wrong (${code}). Please try again.` : "Something went wrong. Please try again.";
  }
}

/** Creates the initial users/{uid} document for a brand-new account. */
async function createUserDocIfMissing(uid: string, email: string, displayName: string, photoURL: string | null) {
  // Only ever create the profile for a brand-new account. Previously this
  // wrote the defaults (blank username, onboardingComplete: false, zeroed
  // counters, accountType: "player") on EVERY Google sign-in, wiping the
  // existing profile and sending returning users back through onboarding.
  const existing = await getDoc(doc(db, "users", uid));
  if (existing.exists()) return;

  await setDoc(
    doc(db, "users", uid),
    {
      uid,
      email,
      displayName,
      accountType: "player",
      username: "",
      bio: "",
      photoURL,
      bannerURL: null,
      favoriteGames: [],
      platform: null,
      skillLevel: "Rookie",
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      tournamentWins: 0,
      reputationScore: 0,
      badges: [],
      fcmTokens: [],
      gameWins: {},
      savedPostIds: [],
      tournamentsOrganized: 0,
      successfulTournamentsOrganized: 0,
      leaguesOrganized: 0,
      successfulLeaguesOrganized: 0,
      onboardingComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function useAuthActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signUpWithEmail(email: string, password: string) {
    setIsLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocIfMissing(cred.user.uid, email, email.split("@")[0], null);
      return cred.user;
    } catch (err: any) {
      setError(friendlyAuthError(err?.code ?? ""));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function loginWithEmail(email: string, password: string) {
    setIsLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Safety net: if this account somehow has no profile document, create
      // one. Never overwrites an existing profile.
      await createUserDocIfMissing(cred.user.uid, cred.user.email ?? email, email.split("@")[0], cred.user.photoURL).catch(() => {});
      return cred.user;
    } catch (err: any) {
      setError(friendlyAuthError(err?.code ?? ""));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function loginWithGoogle() {
    setIsLoading(true);
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await createUserDocIfMissing(
        cred.user.uid,
        cred.user.email ?? "",
        cred.user.displayName ?? "Player",
        cred.user.photoURL
      );
      return cred.user;
    } catch (err: any) {
      setError(friendlyAuthError(err?.code ?? ""));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function resetPassword(email: string) {
    setIsLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(friendlyAuthError(err?.code ?? ""));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return {
    signUpWithEmail,
    loginWithEmail,
    loginWithGoogle,
    resetPassword,
    signOut,
    isLoading,
    error,
  };
}
