"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, Maximize2, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { RetryVideo } from "@/components/shared/RetryVideo";
import { cn } from "@/lib/utils";

/**
 * Instagram-style video: tap to play/pause, double-tap to like (heart burst),
 * a thin seek bar, and an optional expand button. No browser controls, so
 * taps are never swallowed.
 */
export function VideoSurface({
  src,
  poster,
  onDoubleTap,
  onExpand,
  onWatchMore,
  active,
  muted,
  autoplayInView,
  onEnded,
  className,
  videoClassName,
  seekClassName,
}: {
  src: string;
  poster?: string;
  onDoubleTap?: () => void;
  onExpand?: () => void;
  /** When set, a "Watch more videos" screen appears after the video ends. */
  onWatchMore?: () => void;
  /** Reels mode: true = playing, false = paused. Leave undefined for tap-to-play. */
  active?: boolean;
  muted?: boolean;
  /** Feed mode: plays (silently, tap the speaker for sound) while mostly on screen, pauses when scrolled away. */
  autoplayInView?: boolean;
  onEnded?: () => void;
  className?: string;
  videoClassName?: string;
  seekClassName?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const lastTap = useRef(0);
  const singleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(true);
  const [progress, setProgress] = useState(0);
  const [burst, setBurst] = useState(false);
  const [ended, setEnded] = useState(false);

  // Reels mode: play when this one is on screen, pause + rewind when it isn't.
  useEffect(() => {
    const el = ref.current;
    if (!el || active === undefined) return;
    if (active) {
      el.play().catch(() => undefined);
    } else {
      el.pause();
      try { el.currentTime = 0; } catch {}
    }
  }, [active]);

  // Feed mode: start when more than half the video is on screen, pause when it leaves.
  useEffect(() => {
    const box = boxRef.current;
    if (!autoplayInView || !box || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const el = ref.current;
        if (!el) return;
        if (entries[0].isIntersecting && entries[0].intersectionRatio >= 0.6) {
          el.muted = !soundOn;
          el.play().catch(() => undefined);
        } else if (!el.paused) {
          el.pause();
        }
      },
      { threshold: [0, 0.25, 0.6, 1] }
    );
    obs.observe(box);
    return () => obs.disconnect();
  }, [autoplayInView, soundOn]);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => undefined);
    else el.pause();
  }

  function handleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      if (singleTimer.current) clearTimeout(singleTimer.current);
      if (onDoubleTap) {
        onDoubleTap();
        setBurst(true);
        setTimeout(() => setBurst(false), 700);
      }
      return;
    }
    lastTap.current = now;
    if (singleTimer.current) clearTimeout(singleTimer.current);
    singleTimer.current = setTimeout(toggle, 260);
  }

  return (
    <div ref={boxRef} className={cn("relative select-none bg-black", className)} onClick={handleTap}>
      <RetryVideo
        ref={ref}
        src={src}
        poster={poster}
        playsInline
        preload={active === undefined ? "metadata" : "auto"}
        autoPlay={active === true}
        muted={autoplayInView ? !soundOn : muted}
        loop={autoplayInView ? false : undefined}
        className={cn("mx-auto block w-full bg-black object-contain", videoClassName)}
        onPlay={() => { setPaused(false); setEnded(false); }}
        onPause={() => setPaused(true)}
        onEnded={() => { if (onWatchMore) setEnded(true); onEnded?.(); }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration > 0) setProgress(v.currentTime / v.duration);
        }}
      />

      {ended && onWatchMore && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/75 px-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onWatchMore}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black active:scale-95"
          >
            Watch more videos
          </button>
          <button
            type="button"
            onClick={() => {
              setEnded(false);
              const el = ref.current;
              if (el) { el.currentTime = 0; el.play().catch(() => undefined); }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/80"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Watch again
          </button>
        </div>
      )}

      {paused && !ended && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white">
            <Play className="ml-1 h-8 w-8 fill-white" />
          </span>
        </div>
      )}

      {burst && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Heart className="h-24 w-24 animate-[ping_0.6s_ease-out] fill-signal-red text-signal-red drop-shadow-[0_0_20px_rgba(248,113,113,0.6)]" />
        </div>
      )}

      {autoplayInView && (
        <button
          type="button"
          aria-label={soundOn ? "Mute" : "Turn sound on"}
          onClick={(e) => {
            e.stopPropagation();
            const next = !soundOn;
            setSoundOn(next);
            if (ref.current) ref.current.muted = !next;
          }}
          className="absolute bottom-4 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      )}

      {onExpand && (
        <button
          type="button"
          aria-label="Watch full screen"
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Watch
        </button>
      )}

      {!autoplayInView && (
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        aria-label="Seek"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const v = ref.current;
          if (v && v.duration > 0) v.currentTime = (Number(e.target.value) / 1000) * v.duration;
        }}
        className={cn("absolute inset-x-0 bottom-0 z-10 h-1.5 w-full cursor-pointer accent-white opacity-80", seekClassName)}
      />
      )}
    </div>
  );
}
