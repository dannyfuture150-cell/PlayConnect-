"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMentionPool } from "@/hooks/useMentionPool";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  /** Called by the Enter key on a computer. On a phone, Enter always starts a new line. */
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
  /** Smallest height in px. */
  minHeight?: number;
  maxHeight?: number;
  /** Only these people can be suggested (e.g. members of a group). */
  allowedUids?: string[];
  autoFocus?: boolean;
  onBlur?: () => void;
}

const TOKEN = /(^|\s)@([a-z0-9_]{0,20})$/i;

/**
 * A growing text box where Enter makes a new line (send with the button) and
 * typing @ shows a list of players to tag.
 */
export const MentionInput = forwardRef<HTMLTextAreaElement, Props>(function MentionInput(
  { value, onValueChange, onSubmit, placeholder, className, maxLength, disabled, minHeight = 44, maxHeight = 140, allowedUids, autoFocus, onBlur },
  ref
) {
  const { profile } = useAuth();
  const inner = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);

  const before = value.slice(0, caret);
  const m = focused ? TOKEN.exec(before) : null;
  const q = m ? m[2].toLowerCase() : null;
  const pool = useMentionPool(q !== null);

  const matches = useMemo(() => {
    if (q === null || !pool.data) return [];
    return pool.data
      .filter((u) => u.uid !== profile?.uid && (!allowedUids || allowedUids.includes(u.uid)))
      .filter((u) => !q || u.username.toLowerCase().startsWith(q) || u.displayName.toLowerCase().includes(q))
      .slice(0, 5);
  }, [q, pool.data, profile?.uid, allowedUids]);

  // Grow with the text.
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, [value, minHeight, maxHeight]);

  const syncCaret = useCallback(() => setCaret(inner.current?.selectionStart ?? 0), []);

  function pick(username: string) {
    if (!m) return;
    const start = caret - m[2].length - 1; // position of the "@"
    const next = `${value.slice(0, start)}@${username} ${value.slice(caret)}`;
    const pos = start + username.length + 2;
    onValueChange(next);
    setCaret(pos);
    requestAnimationFrame(() => {
      inner.current?.focus();
      inner.current?.setSelectionRange(pos, pos);
    });
  }

  useEffect(() => {
    if (autoFocus) inner.current?.focus();
  }, [autoFocus]);

  return (
    <div className="relative min-w-0 flex-1">
      {matches.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {matches.map((u) => (
            <button
              key={u.uid}
              type="button"
              // Keep the keyboard open while tapping a name.
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => pick(u.username)}
              onTouchEnd={(e) => { e.preventDefault(); pick(u.username); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={u.photoURL ?? undefined} alt="" />
                <AvatarFallback className="text-[11px]">{u.displayName[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{u.displayName}</span>
                <span className="block truncate text-xs text-steel/50">@{u.username}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={inner}
        rows={1}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        enterKeyHint="enter"
        onChange={(e) => { onValueChange(e.target.value); setCaret(e.target.selectionStart ?? 0); }}
        onSelect={syncCaret}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onFocus={() => { setFocused(true); syncCaret(); }}
        onBlur={() => { setTimeout(() => setFocused(false), 150); onBlur?.(); }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
          // Phones: Enter is a new line. Computers: Enter picks a tag, or sends.
          const computer = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
          if (!computer) return;
          if (matches.length > 0) {
            e.preventDefault();
            pick(matches[0].username);
          } else if (onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        style={{ minHeight, maxHeight }}
        className={cn(
          "block w-full resize-none bg-muted px-4 py-2.5 text-[15px] leading-snug text-foreground outline-none placeholder:text-steel/40 disabled:opacity-50",
          className
        )}
      />
    </div>
  );
});
