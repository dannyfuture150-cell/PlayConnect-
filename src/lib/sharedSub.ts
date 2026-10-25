"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * Lets many components share ONE Firestore listener per key instead of each
 * opening its own (the nav bar, sidebar and mobile nav all showed the same
 * badges and each opened duplicate listeners — extra reads and slower app).
 */
interface Entry<T> {
  value: T;
  listeners: Set<() => void>;
  stop: (() => void) | null;
}
const registry = new Map<string, Entry<any>>();

export function useSharedSnapshot<T>(
  key: string | null,
  initial: T,
  start: (emit: (value: T) => void) => () => void
): T {
  // Keep the latest callbacks in refs so `subscribe` below can stay stable
  // (a new subscribe function every render makes React unsubscribe and
  // resubscribe constantly).
  const startRef = useRef(start);
  startRef.current = start;
  const initialRef = useRef(initial);
  initialRef.current = initial;

  const subscribe = useCallback(
    (cb: () => void) => {
      if (!key) return () => {};
      let entry = registry.get(key) as Entry<T> | undefined;
      if (!entry) {
        entry = { value: initialRef.current, listeners: new Set(), stop: null };
        registry.set(key, entry);
      }
      const e = entry;
      e.listeners.add(cb);
      if (!e.stop) {
        e.stop = startRef.current((value) => {
          e.value = value;
          e.listeners.forEach((l) => l());
        });
      }
      return () => {
        e.listeners.delete(cb);
        if (e.listeners.size === 0) {
          // Wait a beat so a quick unmount/remount (route change) reuses the listener.
          setTimeout(() => {
            if (e.listeners.size === 0 && registry.get(key) === e) {
              e.stop?.();
              e.stop = null;
              registry.delete(key);
            }
          }, 3000);
        }
      };
    },
    [key]
  );

  const getSnapshot = useCallback(
    () => (key ? ((registry.get(key) as Entry<T> | undefined)?.value ?? initialRef.current) : initialRef.current),
    [key]
  );
  const getServerSnapshot = useCallback(() => initialRef.current, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
