/** Small dot on a nav icon — "something new here" without a number. */
export function NavDot({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-chrome bg-signal-red" />;
}
