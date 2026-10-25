"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — the app works fine without it, it just means the
        // install prompt may not appear on some Android/Chrome versions.
      });
    }
  }, []);

  return null;
}
