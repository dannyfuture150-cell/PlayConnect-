"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

// Only one video may play at a time across the whole app.
let currentlyPlaying: HTMLVideoElement | null = null;

/**
 * <video> that copes with a freshly uploaded video that is not ready yet: the
 * first requests can fail for a few seconds (longer for big clips), so on an
 * error it quietly retries a few times instead of leaving a broken player.
 */
export const RetryVideo = forwardRef<HTMLVideoElement, React.VideoHTMLAttributes<HTMLVideoElement> & { src: string }>(function RetryVideo(
  { src, className, ...rest },
  ref
) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elRef = useRef<HTMLVideoElement | null>(null);
  const { onPlay, onPause, onEnded } = rest;

  // Keep our own handle on the element and still hand it to the parent's ref.
  const setRefs = useCallback(
    (el: HTMLVideoElement | null) => {
      elRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    },
    [ref]
  );

  // Pause as soon as the video scrolls out of view.
  useEffect(() => {
    const el = elRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting && !el.paused) el.pause();
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (currentlyPlaying === el) currentlyPlaying = null;
    };
  }, [attempt, failed]);
  const MAX_TRIES = 6;

  function onError() {
    if (attempt >= MAX_TRIES) {
      setFailed(true);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAttempt((a) => a + 1), 3000 + attempt * 2000);
  }

  if (failed) {
    return (
      <div className={className}>
        <div className="flex h-full min-h-[8rem] w-full flex-col items-center justify-center gap-2 bg-card p-4 text-center text-xs text-steel/60">
          <p>This video is still processing or can&apos;t be played.</p>
          <button
            type="button"
            className="rounded-full border border-border px-3 py-1 text-foreground"
            onClick={() => {
              setFailed(false);
              setAttempt(0);
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      key={attempt}
      ref={setRefs}
      src={attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}r=${attempt}`}
      className={className}
      onError={onError}
      {...rest}
      onPlay={(e) => {
        // Starting this one stops any other video that is still playing.
        const el = e.currentTarget;
        if (currentlyPlaying && currentlyPlaying !== el && !currentlyPlaying.paused) currentlyPlaying.pause();
        currentlyPlaying = el;
        onPlay?.(e);
      }}
      onPause={(e) => {
        if (currentlyPlaying === e.currentTarget) currentlyPlaying = null;
        onPause?.(e);
      }}
      onEnded={(e) => {
        if (currentlyPlaying === e.currentTarget) currentlyPlaying = null;
        onEnded?.(e);
      }}
    />
  );
});
