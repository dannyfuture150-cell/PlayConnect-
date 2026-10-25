"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

// Only one voice note plays at a time.
let currentlyPlaying: HTMLAudioElement | null = null;

function fmt(s: number) {
  const n = Math.max(0, Math.round(s));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

const RATES = [1, 1.5, 2];

export function VoicePlayer({ url, duration, mine }: { url: string; duration?: number | null; mine: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      if (currentlyPlaying && currentlyPlaying !== a) currentlyPlaying.pause();
      currentlyPlaying = a;
      a.playbackRate = rate;
      a.play().catch(() => setFailed(true));
    } else {
      a.pause();
    }
  }

  function cycleRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (ref.current) ref.current.playbackRate = next;
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = ref.current;
    if (!a || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = frac * total;
    setTime(a.currentTime);
  }

  const pct = total ? Math.min(100, (time / total) * 100) : 0;

  return (
    <div className="flex w-56 max-w-full items-center gap-2.5 py-0.5" onClick={(e) => e.stopPropagation()}>
      <audio
        ref={ref}
        src={url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setTotal(d);
        }}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          mine ? "bg-white/25 text-white" : "bg-violet/15 text-violet-glow"
        )}
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        {failed ? (
          <p className="text-xs opacity-80">
            Can&apos;t play here.{" "}
            <a href={url} target="_blank" rel="noreferrer" className="underline">
              Open
            </a>
          </p>
        ) : (
          <>
            <div
              role="slider"
              aria-label="Voice note position"
              aria-valuemin={0}
              aria-valuemax={Math.round(total)}
              aria-valuenow={Math.round(time)}
              onClick={seek}
              className={cn("relative h-2 cursor-pointer rounded-full", mine ? "bg-white/25" : "bg-black/10 dark:bg-white/15")}
            >
              <div className={cn("h-full rounded-full", mine ? "bg-white" : "bg-violet")} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums opacity-80">
              <span>{fmt(playing || time > 0 ? time : total)}</span>
              <button type="button" onClick={cycleRate} className="rounded-full px-1.5 font-semibold hover:opacity-100">
                {rate}x
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
