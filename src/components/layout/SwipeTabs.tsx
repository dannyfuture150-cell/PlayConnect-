"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSwipe } from "@/hooks/useSwipe";
import { tabTarget } from "@/lib/tabMemory";

// Same order as the bottom tabs (Leagues sits right after Tournaments).
const ORDER = ["/feed", "/search", "/tournaments", "/leagues", "/messages", "/shop"];

/** On phones, swipe left/right on the main pages to move between the bottom tabs, like Instagram. */
export function SwipeTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  // Tournaments and Leagues swipe between each other; the other tabs reopen where you left them.
  const go = (href: string) => (href === "/tournaments" || href === "/leagues" ? href : tabTarget(href, false));
  const i = ORDER.indexOf(pathname.replace(/\/$/, ""));
  const swipe = useSwipe(
    () => i >= 0 && i < ORDER.length - 1 && router.push(go(ORDER[i + 1])),
    () => i > 0 && router.push(go(ORDER[i - 1]))
  );
  if (i < 0) return <>{children}</>;
  return (
    <div {...swipe} className="min-h-[calc(100dvh-10rem)] md:min-h-0">
      {children}
    </div>
  );
}
