"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Users, Search, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Card } from "@/components/ui/card";

const KEY = "playconnect-getstarted-dismissed";

/** Shown to new players so the app never feels empty. */
export function GetStartedCard() {
  const { profile } = useAuth();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden || !profile || (profile.followingCount ?? 0) >= 3) return null;

  const items = [
    { href: "/tournaments", icon: Trophy, title: "Join a tournament", hint: "Compete and win prizes" },
    { href: "/communities", icon: Users, title: "Join a group", hint: "Chat with players of your game" },
    { href: "/explore", icon: Search, title: "Follow players", hint: "Fill your feed with plays" },
  ];

  return (
    <Card className="relative border-violet/30 bg-gradient-to-br from-violet/15 via-card to-cyan/15 p-4">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setHidden(true);
          try { localStorage.setItem(KEY, "1"); } catch {}
        }}
        className="absolute right-3 top-3 text-steel/50 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <h3 className="text-base font-bold text-foreground">Welcome, {profile.displayName.split(" ")[0]} 👋</h3>
      <p className="text-xs text-steel/60">Three quick ways to get going:</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map(({ href, icon: Icon, title, hint }) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-border bg-card/80 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{title}</span>
              <span className="block text-[11px] text-steel/60">{hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
