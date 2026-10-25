"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { reportOrganizer } from "@/hooks/useAdmin";
import { useUnreadNotifications } from "@/hooks/useNotifications";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import { SharePlayerCardButton } from "@/components/shared/SharePlayerCardButton";

const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 0.25,
  dur: 2.8 + (i % 5) * 0.4,
  color: ["#facc15", "#a78bfa", "#34d399", "#f472b6", "#60a5fa"][i % 5],
}));

function Cup() {
  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40 drop-shadow-[0_0_24px_rgba(250,204,21,0.7)]" aria-hidden>
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#facc15" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M32 14h56v28c0 18-12 30-28 30S32 60 32 42z" fill="url(#gold)" />
      <path d="M32 22H16c0 18 8 28 20 30M88 22h16c0 18-8 28-20 30" fill="none" stroke="url(#gold)" strokeWidth="6" strokeLinecap="round" />
      <rect x="54" y="72" width="12" height="16" fill="url(#gold)" />
      <rect x="38" y="88" width="44" height="10" rx="3" fill="url(#gold)" />
      <rect x="30" y="98" width="60" height="10" rx="3" fill="#92400e" />
      <path d="M60 24l4.5 9.5 10.5 1.2-7.8 7.2 2.2 10.3L60 46.8l-9.4 5.4 2.2-10.3-7.800-7.200 10.500-1.200z" fill="#fffbeb" opacity="0.9" />
    </svg>
  );
}

/** Full-screen "you won" popup, shown once for each unread trophy notification. */
export function TrophyCelebration() {
  const { user, profile } = useAuth();
  const unread = useUnreadNotifications(user?.uid);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pending = unread.filter((n) => n.type === "trophy_win" && !dismissed.includes(n.id));

  const current = pending[0];
  if (!user || !current) return null;

  async function close() {
    if (!user || !current) return;
    setDismissed((d) => [...d, current.id]);
    try {
      await updateDoc(doc(db, "notifications", user.uid, "items", current.id), { read: true });
    } catch {
      // best-effort
    }
  }

  // Winners of a prize tournament must answer this before the cup shows.
  const needsConfirm = !!current.prize && !confirmed.includes(current.id);

  async function sendReport() {
    if (!user || !current) return;
    setBusy(true);
    setErr(null);
    try {
      await reportOrganizer({
        reporterId: user.uid,
        organizerId: current.fromUid,
        tournamentId: current.tournamentId ?? "",
        tournamentTitle: current.tournamentTitle ?? "",
        prize: current.prize ?? null,
        note,
      });
      setConfirmed((c) => [...c, current.id]);
      setReporting(false);
      setNote("");
    } catch {
      setErr("Couldn't send the report — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (needsConfirm) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-yellow-400/40 bg-gradient-to-b from-[#2a1f5e] to-[#0b0720] p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-300">One quick check</p>
          <h2 className="font-display text-xl font-extrabold text-white">Did you receive your prize?</h2>
          <p className="text-sm text-white/70">
            You won <span className="font-semibold text-white">{current.tournamentTitle || "the tournament"}</span>
            {" · "}
            <span className="font-semibold text-yellow-300">{current.prize}</span>
          </p>
          {!reporting ? (
            <>
              <button
                onClick={() => {
                  setConfirmed((c) => [...c, current.id]);
                  if (current.tournamentId) {
                    updateDoc(doc(db, "tournaments", current.tournamentId), { prizeConfirmed: true }).catch(() => undefined);
                  }
                }}
                className="w-full rounded-xl bg-yellow-400 py-3 text-sm font-bold text-black active:scale-95"
              >
                Yes, I received it
              </button>
              <button
                onClick={() => setReporting(true)}
                className="w-full rounded-xl border border-red-400/60 py-3 text-sm font-semibold text-red-300 active:scale-95"
              >
                No — report the organiser
              </button>
            </>
          ) : (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="What happened? (optional)"
                className="w-full rounded-xl border border-white/20 bg-black/30 p-3 text-sm text-white placeholder:text-white/40"
              />
              {err && <p className="text-xs text-red-300">{err}</p>}
              <button
                onClick={sendReport}
                disabled={busy}
                className="w-full rounded-xl bg-red-500 py-3 text-sm font-bold text-white disabled:opacity-60 active:scale-95"
              >
                {busy ? "Sending…" : "Send report to admins"}
              </button>
              <button onClick={() => setReporting(false)} className="text-xs text-white/60 underline">Back</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6">
      <style>{`@keyframes pcFall{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(540deg)}}
@keyframes pcPop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}`}</style>
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="pointer-events-none absolute top-0 h-3 w-2 rounded-sm"
          style={{
            left: `${c.left}%`,
            background: c.color,
            animation: `pcFall ${c.dur}s linear ${c.delay}s infinite`,
          }}
        />
      ))}
      <div
        className="relative flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-yellow-400/40 bg-gradient-to-b from-[#2a1f5e] to-[#0b0720] p-8 text-center"
        style={{ animation: "pcPop .6s ease-out both" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-300">Congratulations</p>
        <Cup />
        <h2 className="font-display text-2xl font-extrabold text-white">You are the champion!</h2>
        <p className="text-sm text-white/70">
          You won <span className="font-semibold text-white">{current.tournamentTitle || "the tournament"}</span>
          {current.game ? ` · ${current.game}` : ""}
        </p>
        {current.prize ? (
          <div className="mt-1 rounded-2xl bg-yellow-400/15 px-6 py-3">
            <p className="text-[10px] uppercase tracking-widest text-yellow-200/80">Prize</p>
            <p className="font-display text-3xl font-extrabold text-yellow-300">{current.prize}</p>
          </div>
        ) : null}
        {profile && (
          <SharePlayerCardButton
            profile={profile}
            tournamentTitle={current.tournamentTitle}
            game={current.game}
            className="mt-2 border-0 bg-yellow-400 py-3.5 text-black"
            label="🏆 Share your player card"
          />
        )}
        <button
          onClick={close}
          className="mt-1 w-full rounded-xl border border-white/25 py-3 text-sm font-semibold text-white/80 active:scale-95"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
