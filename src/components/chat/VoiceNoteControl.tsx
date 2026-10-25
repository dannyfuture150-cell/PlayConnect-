"use client";

import { useEffect, useState } from "react";
import { Loader2, Mic, Send, Trash2 } from "lucide-react";
import { MAX_VOICE_SECONDS, useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { cn } from "@/lib/utils";

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Mic button for a chat input row. While recording (or sending) it covers the
 * row with a recording bar, so the parent row must be `relative`.
 */
export function VoiceNoteControl({
  onSend,
  onError,
  disabled,
  className,
}: {
  onSend: (file: File, seconds: number) => Promise<void>;
  onError?: (message: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { recording, seconds, start, stop, cancel } = useVoiceRecorder();
  const [sending, setSending] = useState(false);

  async function begin() {
    onError?.(null);
    const err = await start();
    if (err) onError?.(err);
  }

  async function finish() {
    if (sending) return;
    const result = await stop();
    if (!result) {
      onError?.("That was too short. Keep the mic going a little longer.");
      return;
    }
    setSending(true);
    try {
      await onSend(result.file, result.seconds);
    } catch {
      onError?.("Couldn't send the voice note. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  // Hitting the time limit sends the note automatically.
  useEffect(() => {
    if (recording && seconds >= MAX_VOICE_SECONDS) void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, seconds]);

  return (
    <>
      <button
        type="button"
        onClick={begin}
        disabled={disabled || recording || sending}
        className={cn("shrink-0 rounded-lg p-2 text-steel/50 hover:bg-muted hover:text-steel disabled:opacity-40", className)}
        title="Record a voice note"
        aria-label="Record a voice note"
      >
        <Mic className="h-4 w-4" />
      </button>

      {(recording || sending) && (
        <div className="absolute inset-0 z-10 flex items-center gap-3 bg-card px-3">
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-violet-glow" />
              <span className="text-sm text-steel/70">Sending voice note…</span>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={cancel}
                aria-label="Cancel recording"
                className="rounded-full p-2 text-steel/60 hover:bg-signal-red/10 hover:text-signal-red"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-signal-red" />
              <span className="text-sm font-medium tabular-nums text-foreground">{fmt(seconds)}</span>
              <span className="text-xs text-steel/40">/ {fmt(MAX_VOICE_SECONDS)}</span>
              <button
                type="button"
                onClick={finish}
                aria-label="Send voice note"
                className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white"
              >
                <Send className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
