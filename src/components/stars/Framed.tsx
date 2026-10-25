"use client";

import { useStars } from "@/hooks/useStars";
import { frameStyle } from "@/lib/starsCatalog";

/** Wraps a round avatar in the player's equipped frame (if they have one). */
export function Framed({ uid, children, className, thin }: { uid: string | undefined; children: React.ReactNode; className?: string; thin?: boolean }) {
  const { equipped } = useStars(uid);
  const style = frameStyle(equipped.frame);
  if (!style) return <>{children}</>;
  return (
    <span className={`inline-flex shrink-0 rounded-full ${thin ? "p-[2px]" : "p-[3px]"} ${className ?? ""}`} style={style}>
      {children}
    </span>
  );
}
