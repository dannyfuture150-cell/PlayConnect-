"use client";

import { cn } from "@/lib/utils";

export function ChatModePicker({ value, onChange }: { value: "everyone" | "admins"; onChange: (v: "everyone" | "admins") => void }) {
  const opts = [
    { id: "everyone" as const, title: "All members", hint: "Everyone in the group can chat" },
    { id: "admins" as const, title: "Only admins", hint: "Members can read, only admins can send" },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">Who can send messages?</span>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              value === o.id ? "border-violet bg-violet/10" : "border-border bg-muted"
            )}
          >
            <p className="text-sm font-semibold text-foreground">{o.title}</p>
            <p className="mt-0.5 text-[11px] text-steel/60">{o.hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
