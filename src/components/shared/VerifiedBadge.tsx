"use client";

import { useLiveAuthor } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

/** Small blue tick seal shown next to a name, like Telegram / Instagram. */
export function VerifiedBadge({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label="Verified"
      className={cn("inline-block shrink-0 align-[-2px]", className)}
    >
      <path
        fill="#1d9bf0"
        d="M12 1.6l2.5 1.9 3.1-.2 1.2 2.9 2.8 1.4-.5 3.1 1.6 2.7-2 2.4.1 3.1-3 .9-1.7 2.6-3-.9-3 .9-1.7-2.6-3-.9.1-3.1-2-2.4 1.6-2.7-.5-3.1 2.8-1.4 1.2-2.9 3.1.2z"
      />
      <path d="M7.8 12.4l3 3 5.6-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Looks the person up (shared cache with names/avatars) and shows the tick only if they're verified. */
export function VerifiedTick({ uid, className, size }: { uid: string | undefined; className?: string; size?: number }) {
  const { data } = useLiveAuthor(uid);
  if (!data?.verified) return null;
  return <VerifiedBadge className={cn("ml-1", className)} size={size} />;
}
