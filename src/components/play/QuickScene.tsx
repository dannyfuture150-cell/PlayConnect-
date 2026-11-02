"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Kind = "football" | "fighting" | "shooter";

export function kindOf(game: string): Kind {
  if (/mortal|kombat/i.test(game)) return "fighting";
  if (/blood|strike/i.test(game)) return "shooter";
  return "football";
}

const THEME: Record<Kind, { bg: string; accent: string; title: string; lines: string[]; foundTitle: string }> = {
  football: {
    bg: "linear-gradient(180deg,#0b3d1e 0%,#14803c 55%,#0b3d1e 100%)",
    accent: "#a3e635",
    title: "KICK OFF",
    lines: ["Scouting the pitch…", "Warming up…", "Looking for a rival…", "Checking the line-ups…"],
    foundTitle: "MATCH DAY",
  },
  fighting: {
    bg: "radial-gradient(120% 90% at 50% 0%,#7f1d1d 0%,#1c0606 60%,#000 100%)",
    accent: "#f87171",
    title: "FIGHT",
    lines: ["Finding a challenger…", "Sharpening the blades…", "Choose your fighter…", "Someone dares to enter…"],
    foundTitle: "FINISH HIM",
  },
  shooter: {
    bg: "radial-gradient(120% 90% at 50% 50%,#064e3b 0%,#04211c 60%,#010b09 100%)",
    accent: "#34d399",
    title: "SCANNING",
    lines: ["Scanning the map…", "Locating an enemy squad…", "Loading in…", "Locking on a target…"],
    foundTitle: "TARGET LOCKED",
  },
};

function Backdrop({ kind }: { kind: Kind }) {
  if (kind === "football") {
    return (
      <>
        <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden>
          <g fill="none" stroke="#fff" strokeWidth="1.5">
            <rect x="8" y="8" width="284" height="184" rx="4" />
            <line x1="150" y1="8" x2="150" y2="192" />
            <circle cx="150" cy="100" r="28" />
            <rect x="8" y="55" width="40" height="90" />
            <rect x="252" y="55" width="40" height="90" />
          </g>
        </svg>
        <span className="pc-ball absolute bottom-6 left-0 text-2xl" aria-hidden>⚽</span>
      </>
    );
  }
  if (kind === "fighting") {
    return (
      <>
        <span className="pc-flicker absolute -left-4 top-2 text-6xl opacity-30" aria-hidden>🔥</span>
        <span className="pc-flicker absolute -right-4 top-2 text-6xl opacity-30" style={{ animationDelay: ".4s" }} aria-hidden>🔥</span>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-red-900/70 to-transparent" />
        <svg className="pc-bolt absolute left-1/2 top-0 h-full w-10 -translate-x-1/2 opacity-30" viewBox="0 0 40 200" aria-hidden>
          <polygon points="24,0 8,95 20,95 12,200 34,80 21,80" fill="#fca5a5" />
        </svg>
      </>
    );
  }
  return (
    <>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g fill="none" stroke="#34d399" strokeOpacity="0.35" strokeWidth="1">
          <circle cx="150" cy="100" r="30" />
          <circle cx="150" cy="100" r="60" />
          <circle cx="150" cy="100" r="90" />
          <line x1="150" y1="0" x2="150" y2="200" />
          <line x1="0" y1="100" x2="300" y2="100" />
        </g>
      </svg>
      <div className="pc-sweep absolute left-1/2 top-1/2 h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <span className="pc-blip absolute left-[62%] top-[30%] h-2 w-2 rounded-full bg-emerald-300" />
      <span className="pc-blip absolute left-[30%] top-[64%] h-2 w-2 rounded-full bg-emerald-300" style={{ animationDelay: "1.1s" }} />
    </>
  );
}

function Fighter({ name, photo, label, mystery, accent }: { name: string; photo?: string | null; label: string; mystery?: boolean; accent: string }) {
  return (
    <div className="relative z-10 flex w-[34%] flex-col items-center gap-1.5">
      <div className={mystery ? "pc-mystery" : ""} style={{ borderRadius: "9999px", boxShadow: `0 0 0 3px ${accent}, 0 0 22px ${accent}88` }}>
        <Avatar className="h-16 w-16 ring-0">
          {!mystery && <AvatarImage src={photo ?? undefined} alt={name} />}
          <AvatarFallback className="bg-black/60 text-2xl font-black text-white">{mystery ? "?" : name[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>
      <p className="max-w-full truncate text-xs font-extrabold text-white drop-shadow">{name}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: accent }}>{label}</p>
    </div>
  );
}

/** The 1v1 waiting screen, dressed for the game being played. */
export function QuickScene({
  game,
  me,
  opponent,
  secondsLeft,
}: {
  game: string;
  me: { displayName: string; photoURL?: string | null };
  /** When set, an opponent has been found. */
  opponent?: { displayName: string; photoURL?: string | null } | null;
  secondsLeft?: number;
}) {
  const kind = kindOf(game);
  const t = THEME[kind];
  const found = secondsLeft !== undefined;
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 text-white shadow-xl" style={{ background: t.bg }}>
      <div className="relative h-52">
        <Backdrop kind={kind} />
        <p className="absolute inset-x-0 top-3 z-10 text-center font-display text-[11px] font-black uppercase tracking-[0.4em]" style={{ color: t.accent }}>
          {found ? t.foundTitle : t.title}
        </p>
        <div className="absolute inset-x-0 bottom-5 z-10 flex items-center justify-around px-3">
          <Fighter name={me.displayName} photo={me.photoURL} label="You" accent={t.accent} />
          <span className="pc-vs font-display text-4xl font-black italic drop-shadow" style={{ color: t.accent }}>VS</span>
          <Fighter name={found && opponent ? opponent.displayName : "Searching"} photo={opponent?.photoURL} label={found ? "Opponent" : game} mystery={!(found && opponent)} accent={t.accent} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 bg-black/35 px-4 py-3 text-center backdrop-blur">
        {found ? (
          <>
            <p className="text-sm font-bold">Opponent found. Waiting for them…</p>
            <p className="text-[11px] text-white/70">Both players must be here in <b className="text-white">{secondsLeft}s</b>, or you both go back to searching.</p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${Math.max(0, Math.min(100, ((secondsLeft ?? 0) / 30) * 100))}%`, background: t.accent }} />
            </div>
          </>
        ) : (
          <p key={i} className="pc-fade text-sm font-bold">{t.lines[i % t.lines.length]}</p>
        )}
      </div>
    </div>
  );
}
