"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { hidesTabs } from "@/lib/navVisibility";

/** On phones the top bar (+ / name / profile) goes away inside a chat, group, tournament... like the bottom tabs do. */
export function NavbarSwitch() {
  const pathname = usePathname();
  return (
    <div className={hidesTabs(pathname) ? "hidden md:block" : undefined}>
      <Navbar />
    </div>
  );
}
