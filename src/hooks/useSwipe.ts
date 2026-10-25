"use client";

import { useRef } from "react";

/**
 * Finger-swipe left/right detection for tab switching. Ignores gestures that
 * start on something that scrolls sideways or is dragged (carousels, story
 * rows, brackets, sliders, text inputs, video) so those keep working normally.
 */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);

  function blocked(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    return !!el?.closest?.(".overflow-x-auto, [data-noswipe], input, textarea, video, [role=slider], [role=dialog]");
  }

  return {
    onTouchStart(e: React.TouchEvent) {
      if (e.touches.length !== 1 || blocked(e.target)) {
        start.current = null;
        return;
      }
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    onTouchEnd(e: React.TouchEvent) {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.changedTouches[0].clientX - s.x;
      const dy = e.changedTouches[0].clientY - s.y;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
      if (dx < 0) onLeft();
      else onRight();
    },
  };
}
