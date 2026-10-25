"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Still logs to the browser console for full stack trace debugging.
    console.error("[PlayConnect] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-void px-6 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-xl font-bold text-foreground">Something broke</h1>
        <p className="mt-2 text-sm text-steel/60">
          The app hit an error instead of loading. This is usually a missing or invalid Firebase
          config (check your environment variables), but the exact message is below.
        </p>
        <pre className="mt-4 max-h-40 overflow-auto rounded-xl border border-border bg-card p-3 text-left text-xs text-signal-red">
          {error.message || "Unknown error"}
        </pre>
        <button
          onClick={reset}
          className="mt-5 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
