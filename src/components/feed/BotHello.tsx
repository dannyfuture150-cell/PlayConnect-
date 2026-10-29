"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { callBot } from "@/lib/botClient";

const KEY = "pc_bot_hello";

/** Invisible: the first time a signed-in player opens the feed, lets the bot say welcome (the server decides if they're new). */
export function BotHello() {
  const { profile } = useAuth();
  useEffect(() => {
    if (!profile?.uid) return;
    try {
      if (localStorage.getItem(KEY) === profile.uid) return;
    } catch {
      /* no storage: just ask, the server only welcomes once */
    }
    callBot({ action: "hello" }).then((r) => {
      if (!r.ok) return;
      try {
        localStorage.setItem(KEY, profile.uid);
      } catch {
        /* fine */
      }
    });
  }, [profile?.uid]);
  return null;
}
