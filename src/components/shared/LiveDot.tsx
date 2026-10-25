/** Red dot that blinks with a ring pulsing out of it, like a live broadcast. */
export function LiveDot({ className = "h-2.5 w-2.5" }: { className?: string }) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex h-full w-full animate-pulse rounded-full bg-red-500" />
    </span>
  );
}
