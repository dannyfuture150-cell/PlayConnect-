"use client";

import { ReactNode } from "react";
import { firebaseInitError } from "@/lib/firebase/client";

export function FirebaseConfigGate({ children }: { children: ReactNode }) {
  if (!firebaseInitError) return <>{children}</>;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-void px-6 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-xl font-bold text-foreground">Firebase isn&apos;t configured</h1>
        <p className="mt-2 text-sm text-steel/60">
          PlayConnect can&apos;t start without a valid Firebase config for this deployment.
        </p>
        <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-left text-xs text-signal-red">
          {firebaseInitError}
        </pre>
        <p className="mt-4 text-xs text-steel/50">
          In Vercel: Project → Settings → Environment Variables → add the six{" "}
          <code className="mx-1 rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_FIREBASE_*</code>
          keys from your Firebase Console, for Production/Preview/Development, then redeploy.
        </p>
      </div>
    </div>
  );
}
