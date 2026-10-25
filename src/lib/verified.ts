/** The admin gives this badge from Admin → Users to mark a player or organiser as verified. */
export const VERIFIED_BADGE = "⭐ Verified";

export function hasVerifiedBadge(badges: string[] | undefined | null): boolean {
  return !!badges?.includes(VERIFIED_BADGE);
}
