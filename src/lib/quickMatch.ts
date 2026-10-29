import { auth } from "@/lib/firebase/client";

export const QUICK_GAMES = ["eFootball", "EA FC", "Mortal Kombat"] as const;

export type QuickState = "idle" | "waiting" | "matched" | "expired";
export interface QuickReply {
  ok: boolean;
  state?: QuickState;
  challengeId?: string;
  error?: string;
}

/** Talks to the waiting-room server: join, poll (every few seconds while waiting) and leave. */
export async function callQuick(body: { action: "join"; game: string } | { action: "poll" | "leave" }): Promise<QuickReply> {
  const user = auth.currentUser;
  if (!user) return { ok: false, error: "Please sign in again." };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch("/api/quick", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return (await res.json().catch(() => ({ ok: false, error: "The server didn't answer properly." }))) as QuickReply;
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection." };
  } finally {
    clearTimeout(timer);
  }
}
