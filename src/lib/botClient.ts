import { auth } from "@/lib/firebase/client";

/** Asks the server to let the bot say something (welcome, or "your match is ready"). Never throws: bot messages are a bonus. */
export async function callBot(body: { action: "hello" } | { action: "matches"; tournamentId: string }): Promise<{ ok: boolean }> {
  try {
    const user = auth.currentUser;
    if (!user) return { ok: false };
    const res = await fetch("/api/bot", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify(body),
    });
    return (await res.json().catch(() => ({ ok: false }))) as { ok: boolean };
  } catch {
    return { ok: false };
  }
}
