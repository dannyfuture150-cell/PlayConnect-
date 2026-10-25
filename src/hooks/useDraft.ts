"use client";

import { useCallback, useState } from "react";
import { readDraft, writeDraft } from "@/lib/mentions";

/** Like useState for a message box, but the unsent text survives leaving the screen. */
export function useDraft(key: string) {
  const [text, setTextState] = useState(() => readDraft(key));
  const setText = useCallback(
    (v: string) => {
      setTextState(v);
      writeDraft(key, v);
    },
    [key]
  );
  return [text, setText] as const;
}
