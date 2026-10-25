/** Helpers for the "come back to where you were going" link used by sign-up, sign-in and onboarding. */

/** Only same-site paths are allowed, so a crafted link can't send people to another website. */
export function safeNext(raw?: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}

/** The `next` value from the current page's address (client only). */
export function readNext(): string | null {
  if (typeof window === "undefined") return null;
  return safeNext(new URLSearchParams(window.location.search).get("next"));
}

/** `/signup` + `?next=/tournaments/abc` (or just `/signup` when there's nothing to come back to). */
export function withNext(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
