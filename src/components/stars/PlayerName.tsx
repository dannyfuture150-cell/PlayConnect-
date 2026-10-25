"use client";

import { useStars } from "@/hooks/useStars";
import { nameStyle } from "@/lib/starsCatalog";

/** A player's name. Normal players keep the usual text colour; those who bought a name colour show it everywhere (chat, posts, comments). */
export function PlayerName({ uid, name, className }: { uid: string | undefined; name: string; className?: string }) {
  const { equipped } = useStars(uid);
  const style = nameStyle(equipped.namecolor);
  return (
    <span className={className} style={style}>
      {name}
    </span>
  );
}
