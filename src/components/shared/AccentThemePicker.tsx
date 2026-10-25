"use client";

import { Check } from "lucide-react";
import { useAccentTheme, type AccentTheme } from "@/hooks/useAccentTheme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: AccentTheme; label: string; swatch: string }[] = [
  { value: "default", label: "Default (violet)", swatch: "linear-gradient(90deg,#9333EA,#F472B6)" },
  { value: "blue", label: "Blue", swatch: "linear-gradient(90deg,#1D4ED8,#38BDF8)" },
  { value: "green", label: "Green", swatch: "linear-gradient(90deg,#15803D,#14B8A6)" },
];

export function AccentThemePicker() {
  const { accent, setAccent, mounted } = useAccentTheme();

  if (!mounted) return <div className="h-56 w-full" />;

  return (
    <div className="flex flex-col gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setAccent(opt.value)}
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
            accent === opt.value ? "border-violet/50 bg-violet/5" : "border-border bg-card hover:bg-muted"
          )}
        >
          <span className="h-6 w-6 shrink-0 rounded-full" style={{ background: opt.swatch }} />
          <span className="flex-1 font-medium text-foreground">{opt.label}</span>
          {accent === opt.value && <Check className="h-4 w-4 shrink-0 text-violet-glow" />}
        </button>
      ))}
      <p className="mt-1 text-xs text-steel/50">
        This is just a color preference — it stays on this device and doesn&apos;t change light/dark mode.
      </p>
    </div>
  );
}
