import Link from "next/link";
import { Heart, MessageCircle, UserPlus, Trophy, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { AppNotification } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const COPY: Record<AppNotification["type"], string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  message: "sent you a message",
  tournament_invite: "invited you to a tournament",
  community_invite: "invited you to a community",
  trophy_win: "You won a tournament! 🏆",
  result_submitted: "submitted a match result for you to review",
  result_approved: "approved your match result ✅",
  result_rejected: "rejected your match result — check with the organiser",
  match_ready: "Your next match is ready — find your opponent!",
  spot_open: "A spot just opened in a tournament you wanted 🎉 — grab it!",
  tournament_reminder: "Your tournament starts soon — get ready! 🎮",
  advanced: "Bracket updated 🔥",
  result_reversed: "reversed a match result — the score will be entered again",
  challenge: "challenged you to a match ⚔️",
};

const ICON: Record<AppNotification["type"], typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  message: MessageCircle,
  tournament_invite: Trophy,
  community_invite: Users,
  trophy_win: Trophy,
  result_submitted: Trophy,
  result_approved: Trophy,
  result_rejected: Trophy,
  match_ready: Trophy,
  spot_open: Trophy,
  tournament_reminder: Trophy,
  advanced: Trophy,
  result_reversed: Trophy,
  challenge: Trophy,
};

function linkFor(n: AppNotification): string {
  if (n.type === "follow") return `/profile/${n.fromUser.username}`;
  if (n.type === "trophy_win" && n.tournamentId) return `/tournaments/${n.tournamentId}`;
  if (n.leagueId && ["result_submitted", "result_approved", "result_rejected"].includes(n.type)) return `/leagues/${n.leagueId}`;
  if (n.tournamentId && ["result_submitted", "result_approved", "result_rejected", "match_ready", "spot_open", "tournament_reminder", "advanced", "result_reversed"].includes(n.type)) return `/tournaments/${n.tournamentId}`;
  if (n.type === "tournament_invite") return "/tournaments";
  if (n.type === "community_invite") return "/communities";
  if (n.type === "message") return "/messages";
  if (n.type === "challenge") return "/my";
  return "/feed";
}

export function NotificationItem({ notification }: { notification: AppNotification }) {
  const Icon = ICON[notification.type];
  return (
    <Link href={linkFor(notification)}>
      <div className={cn("flex items-center gap-3 -mx-4 rounded-none border-b border-border/60 px-4 py-3 md:mx-0 md:rounded-xl md:border-0 md:p-3 transition-colors hover:bg-muted", !notification.read && "bg-violet/5")}>
        <Avatar>
          <AvatarImage src={notification.fromUser.photoURL ?? undefined} alt={notification.fromUser.displayName} />
          <AvatarFallback>{notification.fromUser.displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-sm">
          <span className="font-semibold text-foreground">{notification.fromUser.displayName}</span>{" "}
          <span className="text-steel/70">{notification.type === "advanced" ? `Bracket updated — you moved to the ${notification.roundLabel || "next round"} 🔥` : COPY[notification.type]}</span>
          <p className="text-xs text-steel/40">
            {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : "just now"}
          </p>
        </div>
        <Icon className={cn("h-4 w-4 shrink-0", !notification.read ? "text-violet-glow" : "text-steel/30")} />
      </div>
    </Link>
  );
}
