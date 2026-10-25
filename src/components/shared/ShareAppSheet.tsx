"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, MessageSquare, QrCode, Send, Share2, X } from "lucide-react";

const TEXT = "Join me on PlayConnect 🎮 — the app for gamers. Weekly tournaments, real prizes, climb the leaderboard.";

/** Bottom sheet with one-tap sharing to every popular platform, plus copy link and a QR code. */
export function ShareAppSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  if (!open) return null;

  const link = typeof window !== "undefined" ? window.location.origin : "";
  const enc = encodeURIComponent;
  const go = (url: string) => window.open(url, "_blank", "noopener");

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${TEXT}\n${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", link);
    }
  }

  async function more() {
    try {
      if (navigator.share) await navigator.share({ title: "PlayConnect", text: TEXT, url: link });
      else await copy();
    } catch {
      // closed the share sheet
    }
  }

  const items: { label: string; color: string; icon: React.ReactNode; onClick: () => void }[] = [
    { label: "WhatsApp", color: "bg-emerald-500", icon: <MessageCircle className="h-6 w-6" />, onClick: () => go(`https://wa.me/?text=${enc(`${TEXT}\n${link}`)}`) },
    { label: "Telegram", color: "bg-sky-500", icon: <Send className="h-6 w-6" />, onClick: () => go(`https://t.me/share/url?url=${enc(link)}&text=${enc(TEXT)}`) },
    { label: "Facebook", color: "bg-blue-600", icon: <span className="text-xl font-black">f</span>, onClick: () => go(`https://www.facebook.com/sharer/sharer.php?u=${enc(link)}&quote=${enc(TEXT)}`) },
    { label: "X", color: "bg-black", icon: <span className="text-lg font-black">𝕏</span>, onClick: () => go(`https://twitter.com/intent/tweet?text=${enc(TEXT)}&url=${enc(link)}`) },
    { label: "SMS", color: "bg-green-600", icon: <MessageSquare className="h-6 w-6" />, onClick: () => (window.location.href = `sms:?&body=${enc(`${TEXT} ${link}`)}`) },
    { label: "Email", color: "bg-amber-500", icon: <Mail className="h-6 w-6" />, onClick: () => (window.location.href = `mailto:?subject=${enc("Join me on PlayConnect")}&body=${enc(`${TEXT}\n\n${link}`)}`) },
    { label: "TikTok · Instagram · more", color: "bg-gradient-to-br from-pink-500 to-violet-600", icon: <Share2 className="h-6 w-6" />, onClick: more },
    { label: copied ? "Copied!" : "Copy link", color: "bg-zinc-600", icon: copied ? <Check className="h-6 w-6" /> : <Copy className="h-6 w-6" />, onClick: copy },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 pb-8 md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Share PlayConnect</h3>
            <p className="text-xs text-steel/50">Invite your friends to play with you</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-steel/50 hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {items.map((it) => (
            <button key={it.label} onClick={it.onClick} className="flex flex-col items-center gap-1.5 text-center active:scale-95">
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${it.color}`}>{it.icon}</span>
              <span className="text-[11px] font-medium leading-tight text-steel/70">{it.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setQr((v) => !v)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground"
        >
          <QrCode className="h-4 w-4" /> {qr ? "Hide QR code" : "Show QR code (for posters & shops)"}
        </button>
        {qr && (
          <div className="mt-3 flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${enc(link)}`}
              alt="QR code to open PlayConnect"
              className="h-48 w-48 rounded-xl bg-white"
            />
            <p className="text-[11px] text-steel/50">Screenshot it and put it on posters or in game shops.</p>
          </div>
        )}
      </div>
    </div>
  );
}
