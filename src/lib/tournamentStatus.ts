import type { Tournament } from "@/types";

/**
 * Starting the draw does NOT make a tournament live. It goes live when the
 * start time is reached (or when the organiser sets it live by hand), and
 * stays "completed" once finished.
 */
export function effectiveStatus(t: Pick<Tournament, "status" | "startsAt">): Tournament["status"] {
  if (t.status === "completed" || t.status === "live") return t.status;
  const start = t.startsAt?.toMillis?.();
  return start && start <= Date.now() ? "live" : "upcoming";
}
