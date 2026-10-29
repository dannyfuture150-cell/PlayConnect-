"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Circle, X } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useTournaments } from "@/hooks/useTournaments";
import { connectedGames } from "@/lib/gameAccounts";

const KEY = "pc_setup_dismissed";

/** A short "get set up" list for new players. Disappears once everything is done, or when dismissed. */
export function SetupChecklist() {
  const { profile } = useAuth();
  const { data: tournaments } = useTournaments();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  const uid = profile?.uid;
  const isOrganizer = profile?.accountType === "organizer";
  const joined = useMemo(() => !!uid && (tournaments ?? []).some((t) => t.participantIds?.includes(uid)), [tournaments, uid]);

  if (!profile || hidden) return null;

  const steps: { done: boolean; text: string; href?: string }[] = [
    { done: !!profile.photoURL, text: "Add a profile photo", href: "/settings" },
    { done: connectedGames(profile).length > 0, text: "Add your game ID", href: "/settings" },
    isOrganizer
      ? { done: (profile.tournamentsOrganized ?? 0) > 0, text: "Create your first tournament", href: "/tournaments" }
      : { done: joined, text: "Join a tournament", href: "/tournaments" },
    { done: (profile.postsCount ?? 0) >= 3, text: `Make 3 posts — tap + at the top (${Math.min(3, profile.postsCount ?? 0)}/3)` },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* fine: it just comes back next time */
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-bold">Get set up · {doneCount}/{steps.length}</p>
        <button type="button" onClick={dismiss} aria-label="Hide" className="rounded-full p-1 text-steel/50 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {steps.map((s) => {
          const row = (
            <span className={`flex items-center gap-2 text-sm ${s.done ? "text-steel/40 line-through" : "text-foreground"}`}>
              {s.done ? <Check className="h-4 w-4 text-signal-green" /> : <Circle className="h-4 w-4 text-steel/40" />}
              {s.text}
            </span>
          );
          return <li key={s.text}>{!s.done && s.href ? <Link href={s.href}>{row}</Link> : row}</li>;
        })}
      </ul>
    </div>
  );
}
