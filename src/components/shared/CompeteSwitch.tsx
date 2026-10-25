"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Trophy } from "lucide-react";
import { useLeagues } from "@/hooks/useLeagues";
import { cn } from "@/lib/utils";

/** Two big tabs at the top of Tournaments and Leagues so nobody misses leagues. */
export function CompeteSwitch() {
  const pathname = usePathname() ?? "";
  const { data: leagues } = useLeagues();
  const onLeagues = pathname.startsWith("/leagues");
  const open = (leagues ?? []).filter((l) => !l.started).length;

  const tab = (href: string, label: string, Icon: typeof Trophy, active: boolean, badge?: number) => (
    <Link
      href={href}
      className={cn(
        "relative flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold transition-colors",
        active ? "text-foreground" : "text-steel/50"
      )}
    >
      <Icon className="h-4 w-4" /> {label}
      {!!badge && !active && (
        <span className="rounded-full bg-violet px-1.5 text-[10px] font-bold text-white">{badge} open</span>
      )}
      {active && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-violet" />}
    </Link>
  );

  return (
    <div className="-mx-4 flex border-b border-border bg-card md:mx-0 md:rounded-2xl md:border">
      {tab("/tournaments", "Tournaments", Trophy, !onLeagues)}
      {tab("/leagues", "Leagues", Layers, onLeagues, open)}
    </div>
  );
}
