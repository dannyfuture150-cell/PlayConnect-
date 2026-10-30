"use client";

import { useCallback, useEffect, useState } from "react";

export const DEFAULT_BOT_NAME = "PlayConnect Bot";
const KEY = "pc_bot_name";

/** The name a player gave their bot. Kept on this phone only. */
export function useBotName() {
  const [name, setNameState] = useState(DEFAULT_BOT_NAME);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && saved.trim()) setNameState(saved.trim().slice(0, 24));
    } catch {
      /* storage blocked: keep the default */
    }
  }, []);

  const setName = useCallback((value: string) => {
    const v = value.trim().slice(0, 24) || DEFAULT_BOT_NAME;
    setNameState(v);
    try {
      if (v === DEFAULT_BOT_NAME) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  return { name, setName };
}
