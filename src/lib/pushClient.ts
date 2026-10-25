"use client";

import { auth } from "@/lib/firebase/client";

/** Asks the server to send a phone alert for something that just happened. Never throws, never blocks. */
export async function pushAlert(body: Record<string, string>) {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // alerts are best-effort
  }
}
