"use client";

import { useState } from "react";
import { Gamepad2, Trophy } from "lucide-react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/providers/AuthProvider";
import type { AccountType } from "@/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AccountTypeSwitcher() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  async function handleSwitch(next: AccountType) {
    if (!profile || profile.accountTypeLocked || profile.accountType === next || saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), { accountType: next, updatedAt: serverTimestamp() });
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  if (profile.accountTypeLocked) {
    const isOrg = profile.accountType === "organizer";
    return (
      <Card className="p-5">
        <h3 className="font-display text-sm font-semibold text-foreground">Account type</h3>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3">
          {isOrg ? <Trophy className="h-5 w-5 text-violet-glow" /> : <Gamepad2 className="h-5 w-5 text-violet-glow" />}
          <div>
            <p className="text-sm font-medium text-foreground">{isOrg ? "Organiser" : "Player"}</p>
            <p className="text-xs text-steel/50">Chosen at sign-up and can&apos;t be changed.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="font-display text-sm font-semibold text-foreground">Account type</h3>
      <p className="mt-1 text-xs text-steel/50">
        Both are on the same platform — only organisers can create tournaments and leagues.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleSwitch("player")}
          disabled={saving}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-colors",
            profile.accountType === "player" ? "border-violet bg-violet/10" : "border-border bg-card hover:bg-muted"
          )}
        >
          <Gamepad2 className={cn("h-5 w-5", profile.accountType === "player" ? "text-violet-glow" : "text-steel/40")} />
          <span className="text-xs font-semibold text-foreground">Player</span>
        </button>
        <button
          type="button"
          onClick={() => handleSwitch("organizer")}
          disabled={saving}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-colors",
            profile.accountType === "organizer" ? "border-violet bg-violet/10" : "border-border bg-card hover:bg-muted"
          )}
        >
          <Trophy className={cn("h-5 w-5", profile.accountType === "organizer" ? "text-violet-glow" : "text-steel/40")} />
          <span className="text-xs font-semibold text-foreground">Organiser</span>
        </button>
      </div>
    </Card>
  );
}
