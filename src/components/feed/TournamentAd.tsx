"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTournaments } from "@/hooks/useTournaments";
import { effectiveStatus } from "@/lib/tournamentStatus";

const PHOTOS = [
  { src: "/ads/ad-1.jpg", pos: "center 30%" },
  { src: "/ads/ad-2.jpg", pos: "center 35%" },
  { src: "/ads/ad-3.jpg", pos: "center 45%" },
];

const ALL_ART = [
  { src: "/ads/game-football.jpg", pos: "center" },
  { src: "/ads/game-fighting.jpg", pos: "center" },
  { src: "/ads/game-shooter.jpg", pos: "center" },
  ...PHOTOS,
];

/** Picks the artwork that matches the tournament's game; other games rotate through the photos. */
function artFor(game: string | undefined, n: number): { src: string; pos: string } {
  const g = (game ?? "").toLowerCase();
  if (/(efootball|e-football|fc ?2|fc ?\d|ea fc|fifa|pes|football|soccer)/.test(g)) return { src: "/ads/game-football.jpg", pos: "center" };
  if (/(mortal|tekken|street fighter|fighter|fighting|ufc|kombat)/.test(g)) return { src: "/ads/game-fighting.jpg", pos: "center" };
  if (/(call of duty|cod|warzone|pubg|free fire|apex|valorant|fortnite|counter|cs ?go|cs2|shooter)/.test(g)) return { src: "/ads/game-shooter.jpg", pos: "center" };
  return PHOTOS[n % PHOTOS.length];
}

/** Ad-style banner pinned to the very top of the home feed. Only shows when there are upcoming or live tournaments. */
export function TournamentAd() {
  const { data } = useTournaments({ poll: true });
  const [i, setI] = useState(0);
    const list = (data ?? []).filter((t) => effectiveStatus(t) !== "completed");
  const live = list.filter((t) => effectiveStatus(t) === "live");
  const upcoming = list.filter((t) => effectiveStatus(t) === "upcoming");
  // Live ones first, then soonest upcoming.
  const rotation = [...live, ...upcoming].slice(0, 5);

  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), 4500);
    return () => clearInterval(id);
  }, []);

  if (!rotation.length) return null;
  const t = rotation[i % rotation.length];
  const art = artFor(t.game, i);
  const isLive = effectiveStatus(t) === "live";

  const counts = [
    live.length ? `${live.length} ongoing` : "",
    upcoming.length ? `${upcoming.length} upcoming` : "",
  ].filter(Boolean).join(" · ");

  return (
    <Link
      href="/tournaments"
      className="relative flex min-h-[120px] items-end overflow-hidden rounded-2xl bg-brand-gradient p-4 text-white shadow-lg"
    >
      {/* all artworks are stacked; the matching one fades in */}
      {ALL_ART.map((a) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={a.src}
          src={a.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
          style={{ objectPosition: a.pos, opacity: a.src === art.src ? 1 : 0 }}
        />
      ))}
      <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/5" aria-hidden />
      <span className="absolute right-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">Ad</span>
      <span className="relative flex w-full items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold leading-tight drop-shadow">Check out upcoming &amp; ongoing tournaments</span>
          <span className="mt-0.5 block truncate text-xs text-white/90">
            {counts} · {isLive ? "🔴 Live: " : "Next: "}
            {t.title}
            {t.prize ? ` · 🏆 ${t.prize}` : ""}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">
          Play <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </span>
    </Link>
  );
}
