"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PlayConnect] Fatal error in root layout:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0B1120", color: "#E2E8F0", fontFamily: "sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>PlayConnect failed to start</h1>
          <p style={{ fontSize: "13px", color: "#94A3B8", maxWidth: 380, margin: "10px 0" }}>
            This almost always means Firebase environment variables are missing or invalid for
            this deployment. Check Vercel → Project Settings → Environment Variables.
          </p>
          <pre
            style={{
              maxWidth: 380,
              maxHeight: 160,
              overflow: "auto",
              background: "#111A2E",
              border: "1px solid #223252",
              borderRadius: "12px",
              padding: "12px",
              fontSize: "11px",
              color: "#F87171",
              textAlign: "left",
            }}
          >
            {error.message || "Unknown error"}
          </pre>
          <button
            onClick={reset}
            style={{
              marginTop: "18px",
              background: "linear-gradient(90deg,#1D4ED8,#2563EB,#38BDF8)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "10px 22px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
