"use client";

import { useState } from "react";
import { Flag, MoreHorizontal } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { reportUser } from "@/hooks/useAdmin";
import { useAuth } from "@/providers/AuthProvider";

const REASONS = ["Harassment or hate", "Spam or fake account", "Inappropriate content", "Scam or cheating", "Pretending to be someone else"];

export function ReportUserButton({ userId }: { userId: string }) {
  const { profile } = useAuth();
  const [state, setState] = useState<"idle" | "choosing" | "done" | "error">("idle");
  if (!profile || profile.uid === userId) return null;

  return (
    <DropdownMenu.Root onOpenChange={(open) => !open && setState("idle")}>
      <DropdownMenu.Trigger asChild>
        <button className="rounded-lg border border-border p-2.5 text-steel/60 hover:bg-muted" aria-label="More options">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="z-40 min-w-[220px] rounded-xl border border-border bg-card p-1.5 shadow-2xl">
          {state === "done" ? (
            <p className="p-3 text-xs text-steel/70">Thanks — we&apos;ll review this account.</p>
          ) : state === "error" ? (
            <p className="p-3 text-xs text-signal-red">Couldn&apos;t send the report. Try again later.</p>
          ) : state === "choosing" ? (
            <div className="flex flex-col">
              <p className="px-3 py-1.5 text-xs text-steel/50">Why are you reporting this person?</p>
              {REASONS.map((reason) => (
                <DropdownMenu.Item
                  key={reason}
                  onSelect={(e) => {
                    e.preventDefault();
                    reportUser({ reporterId: profile.uid, userId, reason }).then(() => setState("done")).catch(() => setState("error"));
                  }}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm text-steel/80 outline-none hover:bg-muted"
                >
                  {reason}
                </DropdownMenu.Item>
              ))}
            </div>
          ) : (
            <DropdownMenu.Item
              onSelect={(e) => { e.preventDefault(); setState("choosing"); }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-signal-red outline-none hover:bg-signal-red/10"
            >
              <Flag className="h-4 w-4" /> Report this user
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
