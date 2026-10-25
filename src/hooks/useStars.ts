"use client";

import { useEffect, useState } from "react";
import { useSharedSnapshot } from "@/lib/sharedSub";
import { collection, doc, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { MissionProgress } from "@/lib/starsCatalog";

export interface StarsDoc {
  balance: number;
  lifetime: number;
  loginStreak: number;
  owned: string[];
  shields?: number;
  equipped: { frame?: string | null; cardstyle?: string | null; title?: string | null; namecolor?: string | null; banner?: string | null };
}

const EMPTY: StarsDoc = { balance: 0, lifetime: 0, loginStreak: 0, owned: [], equipped: {} };

/** Live stars balance, owned items and equipped cosmetics for a player (anyone can see these). */
export function useStars(uid: string | undefined): StarsDoc {
  // One shared listener per player, however many names and avatars on screen show their cosmetics.
  return useSharedSnapshot<StarsDoc>(uid ? `stars:${uid}` : null, EMPTY, (emit) =>
    onSnapshot(
      doc(db, "stars", uid as string),
      (snap) => {
        const d = snap.data() ?? {};
        emit({ ...EMPTY, ...d, owned: d.owned ?? [], equipped: d.equipped ?? {} } as StarsDoc);
      },
      () => undefined
    )
  );
}

export interface StarLogItem {
  id: string;
  amount: number;
  reason: string;
  createdAt?: { toDate?: () => Date };
}

/** The signed-in player's recent star activity. */
export function useStarLog(uid: string | undefined) {
  const [items, setItems] = useState<StarLogItem[]>([]);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "stars", uid, "log"), orderBy("createdAt", "desc"), limit(15)),
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StarLogItem))),
      () => undefined
    );
  }, [uid]);
  return items;
}

/** Calls the server (the only place stars can change). */
export async function callStars(
  body:
    | { action: "sync" | "missions" | "buyShield" }
    | { action: "redeem"; itemId: string }
    | { action: "equip"; slot: string; itemId: string | null }
    | { action: "joinTournament" | "leaveTournament"; tournamentId: string }
    | { action: "shopBuy"; itemId: string }
    | { action: "shopDeliver" | "shopConfirm" | "shopCancel"; orderId: string }
) {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: "Please sign in again." } as const;
  // Never leave a button stuck on "Please wait": give up after 25s and always return an answer.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch("/api/stars", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return (await res.json().catch(() => ({ ok: false, error: "The server didn't answer properly. Try again in a moment." }))) as { ok: boolean; error?: string; missions?: MissionProgress[]; weekEnds?: number };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." } as const;
  } finally {
    clearTimeout(timer);
  }
}
