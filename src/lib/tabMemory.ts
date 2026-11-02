/**
 * Remembers where you were inside each bottom tab (for example the chat you had open), so switching to
 * another tab and back puts you in the same place. Lives in memory only: a page refresh starts fresh.
 */
const TABS = [
  { href: "/feed", prefixes: ["/feed"] },
  { href: "/search", prefixes: ["/search"] },
  { href: "/tournaments", prefixes: ["/tournaments", "/leagues"] },
  { href: "/messages", prefixes: ["/messages", "/communities"] },
  { href: "/shop", prefixes: ["/shop"] },
];

const last = new Map<string, string>();

function tabOf(path: string) {
  return TABS.find((t) => t.prefixes.some((p) => path === p || path.startsWith(`${p}/`)));
}

/** Call whenever the page changes. */
export function rememberTab(path: string, search = "") {
  const t = tabOf(path);
  if (t) last.set(t.href, path + search);
}

/** Where a tab button should go: back to where you left off, or the tab's start when you tap the tab you're already on. */
export function tabTarget(href: string, activeNow: boolean): string {
  return activeNow ? href : last.get(href) ?? href;
}
