import { format, isToday, isYesterday, differenceInCalendarDays } from "date-fns";

/** "3:14 PM" */
export const clockTime = (d: Date) => format(d, "h:mm a");

/** Divider above a group of messages: Today / Yesterday / Monday / 12 Oct 2026 */
export function dayLabel(d: Date): string {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (differenceInCalendarDays(new Date(), d) < 7) return format(d, "EEEE");
  return format(d, "d MMM yyyy");
}

/** Chat-list time: clock time today, then Yesterday, then the date. */
export function listTime(d: Date): string {
  if (isToday(d)) return clockTime(d);
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d/M/yy");
}

/** "last seen today at 3:14 PM" */
export function lastSeenLabel(d: Date): string {
  if (isToday(d)) return `last seen today at ${clockTime(d)}`;
  if (isYesterday(d)) return `last seen yesterday at ${clockTime(d)}`;
  return `last seen ${format(d, "d MMM")} at ${clockTime(d)}`;
}
