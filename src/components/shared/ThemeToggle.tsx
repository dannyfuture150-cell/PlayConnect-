"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compact icon toggle for the navbar, and a labeled version for Settings.
 * `mounted` guards against a hydration mismatch, since next-themes only
 * knows the real theme after the client mounts.
 */
export function ThemeToggle({ variant = "icon", chrome = false }: { variant?: "icon" | "labeled"; chrome?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={variant === "icon" ? "h-9 w-9" : "h-11 w-full"} />;
  }

  const isDark = theme === "dark";

  if (variant === "labeled") {
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-steel transition-colors hover:bg-muted"
      >
        <span className="flex items-center gap-2.5">
          {isDark ? <Moon className="h-4 w-4 text-violet-glow" /> : <Sun className="h-4 w-4 text-violet-glow" />}
          {isDark ? "Dark mode" : "Light mode"}
        </span>
        <span
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors",
            isDark ? "bg-brand-gradient" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
              isDark ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle dark mode"
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        chrome
          ? "text-chrome-foreground/60 hover:bg-chrome-muted hover:text-chrome-foreground"
          : "text-steel/60 hover:bg-muted hover:text-foreground"
      )}
    >
      {isDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  );
}
