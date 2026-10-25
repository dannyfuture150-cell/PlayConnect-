"use client";

import { useEffect, useState } from "react";

export type AccentTheme = "default" | "blue" | "green";
const ACCENTS: AccentTheme[] = ["default", "blue", "green"];

const STORAGE_KEY = "playconnect-accent";

/**
 * A second, independent theme dimension from light/dark mode: which accent
 * color is used. Entirely optional — "default" (violet) is what everyone
 * gets unless they explicitly pick something else, and the choice persists
 * per-browser via localStorage (not synced to the account, on purpose, to
 * keep this simple and avoid another Firestore round-trip for something
 * this cosmetic).
 */
export function useAccentTheme() {
  const [accent, setAccentState] = useState<AccentTheme>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AccentTheme | null;
    if (stored && ACCENTS.includes(stored)) setAccentState(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (accent === "default") {
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", accent);
    }
  }, [accent, mounted]);

  function setAccent(next: AccentTheme) {
    setAccentState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return { accent: mounted ? accent : "default", setAccent, mounted };
}
