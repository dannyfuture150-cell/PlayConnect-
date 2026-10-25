"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { ShareAppSheet } from "@/components/shared/ShareAppSheet";

/** "Invite friends": opens the share sheet (WhatsApp, Telegram, Facebook, X, SMS, email, copy link, QR). */
export function InviteButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left active:scale-[0.99] ${className}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <Share2 className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-foreground">Share PlayConnect</span>
          <span className="block text-[11px] text-steel/50">WhatsApp, Telegram, TikTok, Facebook & more</span>
        </span>
      </button>
      <ShareAppSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
