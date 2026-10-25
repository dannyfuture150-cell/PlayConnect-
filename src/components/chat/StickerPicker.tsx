"use client";

import { Smile } from "lucide-react";
import { useState } from "react";
import { STICKERS, stickerById } from "@/lib/stickers";
import { cn } from "@/lib/utils";

/** A sticker as it appears in a chat. */
export function StickerView({ id, className }: { id: string; className?: string }) {
  const s = stickerById(id);
  if (!s) return <span className="text-sm opacity-60">Sticker</span>;
  return (
    <div className={cn("flex h-28 w-28 flex-col items-center justify-center rounded-2xl text-white shadow-md", className)} style={{ backgroundImage: s.bg }}>
      <span className="text-5xl leading-none drop-shadow">{s.emoji}</span>
      <span className="mt-1 max-w-full truncate px-2 text-[12px] font-extrabold uppercase tracking-wide drop-shadow">{s.label}</span>
    </div>
  );
}

/** A smiley button that opens a tray of stickers; tapping one sends it. */
export function StickerPicker({ onPick, disabled }: { onPick: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn("shrink-0 rounded-lg p-2 text-steel/50 hover:bg-muted hover:text-steel disabled:opacity-40", open && "bg-muted text-foreground")}
        title="Stickers"
        aria-label="Stickers"
      >
        <Smile className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 z-30 border-t border-border bg-card p-2 shadow-lg">
          <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto">
            {STICKERS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setOpen(false); onPick(s.id); }}
                className="flex aspect-square flex-col items-center justify-center rounded-xl text-white active:scale-95"
                style={{ backgroundImage: s.bg }}
              >
                <span className="text-2xl leading-none">{s.emoji}</span>
                <span className="mt-0.5 max-w-full truncate px-1 text-[9px] font-bold uppercase">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
