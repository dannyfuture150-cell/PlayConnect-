"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Trophy, MessageCircle, ShoppingBag } from "lucide-react";
import { hidesTabs } from "@/lib/navVisibility";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useUnreadThreadCount } from "@/hooks/useMessages";
import { useCommunityUnreadTotal } from "@/hooks/useCommunities";
import { NavBadge } from "@/components/shared/NavBadge";
import { NavDot } from "@/components/shared/NavDot";
import { useNewTournamentsDot } from "@/hooks/useTournamentDot";

const MOBILE_NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/messages", label: "Chat", icon: MessageCircle },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
];

/**
 * The Sidebar (desktop nav) is hidden below the `md` breakpoint, so phones
 * need their own way to get around the app. This renders a fixed bottom tab
 * bar on mobile only; Notifications/My profile/Settings live in the navbar's
 * account dropdown instead, since there isn't room for all of it down here.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const unreadThreads = useUnreadThreadCount(profile?.uid);
  const unreadGroups = useCommunityUnreadTotal(profile?.uid, profile?.communitySeenCounts, profile?.communityChatSeen);
  const newTournament = useNewTournamentsDot(profile?.uid);

  if (hidesTabs(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-chrome-border bg-chrome px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
      {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href) || (href === "/messages" && !!pathname?.startsWith("/communities")) || (href === "/tournaments" && !!pathname?.startsWith("/leagues"));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10.5px] font-medium transition-colors",
              active ? "text-chrome-foreground" : "text-chrome-foreground/45"
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {href === "/messages" && <NavBadge count={unreadThreads + unreadGroups} />}
              {href === "/tournaments" && <NavDot show={newTournament && !pathname?.startsWith("/tournaments")} />}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
