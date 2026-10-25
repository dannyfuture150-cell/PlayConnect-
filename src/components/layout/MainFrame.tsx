"use client";

import { usePathname } from "next/navigation";
import { hidesTabs } from "@/lib/navVisibility";
import { cn } from "@/lib/utils";

/** The page area. Leaves room for the bottom tabs only on pages that show them. */
export function MainFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <main
      className={cn(
        "min-h-[calc(100dvh-4rem)] min-w-0 flex-1 px-4 py-6 md:px-8 md:pb-6",
        hidesTabs(pathname) ? "pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-6" : "pb-24"
      )}
    >
      {children}
    </main>
  );
}
