"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { rememberTab } from "@/lib/tabMemory";

const ROOTS = new Set(["/feed", "/search", "/tournaments", "/leagues", "/messages", "/shop"]);
const positions = new Map<string, number>();

/**
 * Keeps your place on the main tabs: the page is scrolled back to where you left it when you come back,
 * and the bottom tabs remember the page you were on in each one. Opening something new still starts at the top.
 */
export function ScrollMemory() {
  const pathname = usePathname() ?? "";
  const lastPath = useRef<string | null>(null);
  const saveKey = useRef<string>(pathname);
  const locked = useRef(false);
  const popped = useRef(false);

  // The moment the path changes (before the browser jumps to the top), stop recording scroll.
  if (lastPath.current !== null && lastPath.current !== pathname) locked.current = true;

  useEffect(() => {
    const onScroll = () => {
      if (!locked.current) positions.set(saveKey.current, window.scrollY);
    };
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  useEffect(() => {
    const first = lastPath.current === null;
    lastPath.current = pathname;
    saveKey.current = pathname;
    rememberTab(pathname, window.location.search);

    // Come back to the saved spot on a main tab, or when pressing Back anywhere.
    const target = positions.get(pathname) ?? 0;
    const wantRestore = !first && target > 0 && (ROOTS.has(pathname) || popped.current);
    popped.current = false;

    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const restore = () => {
      window.scrollTo(0, target);
      tries++;
      // the list may still be loading: keep trying briefly until the page is tall enough
      if (Math.abs(window.scrollY - target) > 4 && tries < 25) timer = setTimeout(restore, 80);
      else locked.current = false;
    };
    if (wantRestore) timer = setTimeout(restore, 30);
    else timer = setTimeout(() => (locked.current = false), 400);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
