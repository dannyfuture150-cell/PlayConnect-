"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

/**
 * Adds/removes the `dark` class on <html> based on the chosen theme.
 * `defaultTheme="light"` keeps the app on the white/blue theme unless the
 * user explicitly opts into the navy dark theme; `enableSystem={false}`
 * means we don't auto-follow the OS setting, since dark mode here is a
 * deliberate look (blue navy), not just an inverted palette.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
