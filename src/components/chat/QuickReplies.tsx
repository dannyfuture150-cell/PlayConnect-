"use client";

const REPLIES = ["Ready ✅", "Give me 5 min ⏱️", "GG 🤝", "Rematch?", "Where are you?", "On my way 🏃"];

/** One-tap replies above the message box, for the things players say all the time. */
export function QuickReplies({ onPick, disabled }: { onPick: (text: string) => void; disabled?: boolean }) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto px-2 pb-1 pt-1.5">
      {REPLIES.map((r) => (
        <button
          key={r}
          type="button"
          disabled={disabled}
          onClick={() => onPick(r)}
          className="shrink-0 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-steel/80 active:scale-95 disabled:opacity-40"
        >
          {r}
        </button>
      ))}
    </div>
  );
}
