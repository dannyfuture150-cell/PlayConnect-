"use client";

import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import type { Ad } from "@/types";
import { trackAdClick, trackAdImpression } from "@/hooks/useAds";
import { Card } from "@/components/ui/card";

/** A clearly-labelled sponsored card. Counts one view when it scrolls into sight, and a click when tapped. */
export function AdCard({ ad, compact = false }: { ad: Ad; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || ad.id === "preview") return; // the admin preview is not a real ad
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          trackAdImpression(ad.id);
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ad.id]);

  return (
    <Card ref={ref} className="overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-steel/50">Sponsored · {ad.sponsor}</span>
      </div>
      {ad.imageUrl && !compact && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.imageUrl} alt="" className="mt-3 aspect-video w-full object-cover" loading="lazy" />
      )}
      <div className={compact ? "flex items-center gap-3 p-4 pt-2" : "p-4"}>
        {ad.imageUrl && compact && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{ad.title}</p>
          {ad.text && <p className="mt-0.5 text-xs leading-relaxed text-steel/70">{ad.text}</p>}
        </div>
        <a
          href={ad.linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => ad.id !== "preview" && trackAdClick(ad.id)}
          className={
            "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2 text-xs font-semibold text-white " +
            (compact ? "" : "mt-3")
          }
        >
          {ad.ctaLabel || "Learn more"} <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </Card>
  );
}
