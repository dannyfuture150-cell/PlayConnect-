"use client";

import { useState } from "react";
import { CARD_STYLE_THEME } from "@/lib/starsCatalog";
import { RANK_THEME } from "@/lib/playerCardSnapshot";
import type { PlayerCardSnapshot } from "@/types";

/**
 * eFootball-style player card. Tap to flip: the front is the big photo with
 * name and rank, the back has the details and the small photo.
 */
export function FlipCard({ card, className = "w-40" }: { card: PlayerCardSnapshot; className?: string }) {
  const [flipped, setFlipped] = useState(false);
  const t = (card.style && CARD_STYLE_THEME[card.style]) || RANK_THEME[card.rank] || RANK_THEME.Rookie;
  const face: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    background: `linear-gradient(160deg, ${t.a}, ${t.b})`,
    color: t.text,
  };

  return (
    <button
      type="button"
      data-noswipe
      onClick={() => setFlipped((f) => !f)}
      aria-label={flipped ? "Show front of card" : "Show back of card"}
      className={`relative block aspect-[5/7] shrink-0 text-left ${className}`}
      style={{ perspective: 900 }}
    >
      <div
        className="relative h-full w-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        {/* Front */}
        <div style={face} className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10">
          {card.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.photoURL} alt={card.displayName} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl font-black opacity-70">{card.displayName[0]?.toUpperCase()}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
          <div className="absolute left-2.5 top-2 text-left leading-none">
            <p className="text-2xl font-black drop-shadow">{card.reputation}</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest opacity-90">{card.rank}</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-2.5">
            <p className="truncate text-sm font-extrabold tracking-wide drop-shadow">{card.displayName}</p>
            <p className="truncate text-[10px] opacity-80">@{card.username}</p>
          </div>
        </div>

        {/* Back */}
        <div style={{ ...face, transform: "rotateY(180deg)" }} className="flex flex-col items-center overflow-hidden rounded-2xl p-3 shadow-lg ring-1 ring-black/10">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white/70 bg-black/20">
            {card.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-black">{card.displayName[0]?.toUpperCase()}</span>
            )}
          </div>
          <p className="mt-1.5 max-w-full truncate text-xs font-extrabold">{card.displayName}</p>
          {card.title && <p className="mt-0.5 max-w-full truncate text-[10px] font-semibold">{card.title}</p>}
          {card.headline && <p className="mt-0.5 line-clamp-2 text-center text-[10px] font-semibold opacity-90">{card.headline}</p>}
          {card.tournamentTitle && <p className="mt-0.5 line-clamp-2 text-center text-[10px] opacity-90">🏆 {card.tournamentTitle}</p>}
          <dl className="mt-2 w-full space-y-1 text-[11px]">
            {[
              ["Rank", card.rank],
              ["Platform", card.platform ?? "—"],
              ["Wins", String(card.wins)],
              ["Followers", String(card.followers)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 rounded bg-black/20 px-2 py-0.5">
                <dt className="opacity-80">{k}</dt>
                <dd className="truncate font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          {card.games.length > 0 && <p className="mt-auto line-clamp-2 pt-1 text-center text-[10px] opacity-90">{card.games.join(" · ")}</p>}
        </div>
      </div>
    </button>
  );
}
