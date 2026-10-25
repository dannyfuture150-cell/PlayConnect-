"use client";

import { cn } from "@/lib/utils";

export const POPULAR_GAMES = [
  "eFootball",
  "EA FC",
  "Dream League Soccer",
  "Call of Duty",
  "PUBG",
  "Fortnite",
  "Mobile Legends",
  "Free Fire",
  "Valorant",
  "League of Legends",
  "Apex Legends",
  "Minecraft",
  "GTA Online",
  "Mortal Kombat",
  "Blood Strike",
  "Racing",
];

export function ChipMultiSelect({
  value,
  onChange,
  max = 8,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  function toggle(game: string) {
    if (value.includes(game)) {
      onChange(value.filter((g) => g !== game));
    } else if (value.length < max) {
      onChange([...value, game]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {POPULAR_GAMES.map((game) => {
        const selected = value.includes(game);
        return (
          <button
            key={game}
            type="button"
            onClick={() => toggle(game)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
              selected
                ? "border-violet/50 bg-brand-gradient text-white shadow-[0_0_14px_rgba(37,99,235,0.3)]"
                : "border-border bg-card text-steel/70 hover:border-border hover:text-foreground"
            )}
          >
            {game}
          </button>
        );
      })}
    </div>
  );
}
