"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Copy, Share2, UserPlus } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { STAR_RULES } from "@/lib/starsCatalog";

/** "Refer players, earn PlayCoins": your invite link and how many friends joined through it. */
export function ReferCard() {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<{ uid: string; displayName: string }[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    return onSnapshot(
      query(collection(db, "users"), where("referredBy", "==", profile.uid)),
      (snap) => setFriends(snap.docs.map((d) => ({ uid: d.id, displayName: (d.data().displayName as string) || (d.data().username as string) || "Player" }))),
      () => undefined
    );
  }, [profile?.uid]);

  if (!profile) return null;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${profile.username}`;
  const text = `Join me on PlayConnect: play tournaments, win prizes and climb the ranks! ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join me on PlayConnect", text });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
    copy();
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 font-display text-lg font-bold">
        <UserPlus className="h-5 w-5" /> Refer players, earn PlayCoins
      </p>
      <p className="mt-1 text-sm text-steel/70">
        You get <b>{STAR_RULES.referrer} 🪙</b> when a player you refer joins their first tournament. They get <b>{STAR_RULES.referee} 🪙</b> to start. (Up to {STAR_RULES.maxReferrals} players.)
      </p>
      <div className="mt-3 truncate rounded-xl bg-muted px-3 py-2.5 text-xs text-steel/80">{link}</div>
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" onClick={share}>
          <Share2 className="mr-1.5 h-4 w-4" /> Share invite
        </Button>
        <Button variant="outline" onClick={copy}>
          <Copy className="mr-1.5 h-4 w-4" /> {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-3 text-xs text-steel/60">
        {friends.length === 0
          ? "Nobody has joined through your link yet."
          : `${friends.length} player${friends.length === 1 ? "" : "s"} joined through you: ${friends.slice(0, 5).map((f) => f.displayName).join(", ")}${friends.length > 5 ? "…" : ""}`}
      </p>
    </section>
  );
}
