"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Trophy, Bell, MessageCircle, Settings, User, Layers, Search, Award, Bookmark, Radio, ListChecks, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useUnreadThreadCount } from "@/hooks/useMessages";
import { useCommunityUnreadTotal } from "@/hooks/useCommunities";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { useNewTournamentsDot } from "@/hooks/useTournamentDot";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/my", label: "My stuff", icon: ListChecks },
  { href: "/search", label: "Search", icon: Search },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/communities", label: "Communities", icon: Users },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/leaderboard", label: "Leaderboard", icon: Award },
  { href: "/leagues", label: "Leagues", icon: Layers },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const unreadThreads = useUnreadThreadCount(profile?.uid);
  const unreadNotifications = useUnreadNotificationCount(profile?.uid);
  const unreadGroups = useCommunityUnreadTotal(profile?.uid, profile?.communitySeenCounts, profile?.communityChatSeen);
  const newTournament = useNewTournamentsDot(profile?.uid);

  function badgeFor(href: string) {
    if (href === "/messages") return unreadThreads;
    if (href === "/notifications") return unreadNotifications;
    if (href === "/communities") return unreadGroups;
    return 0;
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r border-chrome-border bg-chrome px-3 py-6 md:flex">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          const badgeCount = badgeFor(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-chrome-muted text-chrome-foreground"
                  : "text-chrome-foreground/60 hover:bg-chrome-muted hover:text-chrome-foreground"
              )}
            >
              <span className="relative">
                <Icon className={cn("h-[18px] w-[18px]", active && "text-violet-glow")} />
              </span>
              {label}
              {href === "/tournaments" && newTournament && !active && (
                <span className="ml-auto h-2.5 w-2.5 rounded-full bg-signal-red" />
              )}
              {badgeCount > 0 && (
                <span className="ml-auto rounded-full bg-signal-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 h-px bg-chrome-muted" />

      <div className="mt-2 flex flex-col gap-1">
        {profile && (
          <Link
            href={`/profile/${profile.username}`}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              pathname?.startsWith("/profile")
                ? "bg-chrome-muted text-chrome-foreground"
                : "text-chrome-foreground/60 hover:bg-chrome-muted hover:text-chrome-foreground"
            )}
          >
            <User className="h-[18px] w-[18px]" />
            My profile
          </Link>
        )}
        <Link
          href="/saved"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
            pathname?.startsWith("/saved")
              ? "bg-chrome-muted text-chrome-foreground"
              : "text-chrome-foreground/60 hover:bg-chrome-muted hover:text-chrome-foreground"
          )}
        >
          <Bookmark className="h-[18px] w-[18px]" />
          Saved
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
            pathname?.startsWith("/settings")
              ? "bg-chrome-muted text-chrome-foreground"
              : "text-chrome-foreground/60 hover:bg-chrome-muted hover:text-chrome-foreground"
          )}
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
