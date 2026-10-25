"use client";

import Image from "next/image";
import { PRESET_AVATARS } from "@/lib/presetAvatars";
import { cn } from "@/lib/utils";

export function PresetAvatarPicker({
  selectedUrl,
  onSelect,
}: {
  selectedUrl?: string | null;
  onSelect: (url: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {PRESET_AVATARS.map((avatar) => {
        const isSelected = selectedUrl === avatar.url;
        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.url)}
            title={avatar.label}
            className={cn(
              "relative h-14 w-14 overflow-hidden rounded-full ring-2 transition-all",
              isSelected ? "ring-violet-glow" : "ring-transparent hover:ring-border"
            )}
          >
            <Image src={avatar.url} alt={avatar.label} fill className="object-cover" />
          </button>
        );
      })}
    </div>
  );
}
