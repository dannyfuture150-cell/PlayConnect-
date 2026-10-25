"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Coins, Search, LogOut, Bell, MessageCircle, Award, Radio, ShieldCheck, Download, Share2, Heart } from "lucide-react";
import { FollowListDialog } from "@/components/profile/FollowListDialog";
import { useStars } from "@/hooks/useStars";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ShareAppSheet } from "@/components/shared/ShareAppSheet";
import { CreatePostForm } from "@/components/feed/CreatePostForm";
import { NavBadge } from "@/components/shared/NavBadge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/providers/AuthProvider";
import { useAuthActions } from "@/hooks/useAuthActions";
import { useUnreadThreadCount } from "@/hooks/useMessages";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";

export function Navbar() {
  const { profile } = useAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  // On phones the + and the name show on the Feed tab only; other tabs just show your profile.
  const onFeed = pathname === "/feed" || pathname.startsWith("/feed/");
  const onSearch = pathname.startsWith("/search");
  const unreadThreads = useUnreadThreadCount(profile?.uid);
  const unreadNotifications = useUnreadNotificationCount(profile?.uid);
  const { installed } = useInstallPrompt();
  const stars = useStars(profile?.uid);
  const hasUnread = unreadThreads > 0 || unreadNotifications > 0;
  const [searchText, setSearchText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchText.trim()) router.push(`/search?q=${encodeURIComponent(searchText.trim())}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between border-b border-chrome-border bg-chrome px-4 pt-[env(safe-area-inset-top)] md:px-6">
      <div className={`flex items-center gap-3 ${onFeed ? "" : "hidden md:flex"}`}>
        <CreatePostForm />
      </div>
      {onSearch && profile && (
        <div className="md:hidden">
          <FollowListDialog uid={profile.uid} kind="followers">
            <button type="button" aria-label="My followers" className="flex h-9 w-9 items-center justify-center rounded-full text-chrome-foreground active:bg-chrome-muted">
              <Heart className="h-5 w-5" />
            </button>
          </FollowListDialog>
        </div>
      )}
      <span className={`pointer-events-none ${onFeed || onSearch ? "" : "hidden md:block"} absolute left-1/2 -translate-x-1/2 select-none md:static md:translate-x-0 font-wordmark text-[17px] font-normal uppercase leading-none tracking-[0.2em] pl-[0.2em]`} aria-label="PlayConnect">
        <span className="text-chrome-foreground">PlayConnect</span>
      </span>

      <form onSubmit={handleSearchSubmit} className="hidden max-w-md flex-1 items-center gap-2 px-8 md:flex">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-chrome-foreground/40" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search players, tournaments, communities…"
            className="h-10 w-full rounded-xl border border-chrome-border bg-chrome-muted pl-9 pr-3 text-sm text-chrome-foreground placeholder:text-chrome-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1.5 md:ml-0">
        <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="relative flex items-center gap-2 rounded-full transition-opacity hover:opacity-80">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.photoURL ?? undefined} alt={profile?.displayName ?? "Player"} />
              <AvatarFallback>{profile?.displayName?.[0]?.toUpperCase() ?? "P"}</AvatarFallback>
            </Avatar>
            {hasUnread && (
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-chrome bg-signal-red" />
            )}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-40 min-w-[180px] rounded-xl border border-chrome-border bg-chrome p-1.5 shadow-2xl"
          >
            <DropdownMenu.Item asChild>
              <Link
                href={profile ? `/profile/${profile.username}` : "#"}
                className="block cursor-pointer rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
              >
                My profile
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/my"
                className="block cursor-pointer rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
              >
                My stuff
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/stars"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
              >
                <Coins className="h-4 w-4 text-yellow-400" />
                PlayCoins
                <span className="ml-auto text-xs font-semibold text-yellow-400">{stars.balance}</span>
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/saved"
                className="block cursor-pointer rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
              >
                Saved
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/live"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
              >
                <Radio className="h-4 w-4" />
                Live
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/leaderboard"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
              >
                <Award className="h-4 w-4" />
                Leaderboard
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/notifications"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
              >
                <span className="relative">
                  <Bell className="h-4 w-4" />
                  <NavBadge count={unreadNotifications} />
                </span>
                Notifications
                {unreadNotifications > 0 && (
                  <span className="ml-auto rounded-full bg-signal-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/messages"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
              >
                <span className="relative">
                  <MessageCircle className="h-4 w-4" />
                  <NavBadge count={unreadThreads} />
                </span>
                Messages
                {unreadThreads > 0 && (
                  <span className="ml-auto rounded-full bg-signal-red px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadThreads > 99 ? "99+" : unreadThreads}
                  </span>
                )}
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => setShareOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
            >
              <Share2 className="h-4 w-4" />
              Share PlayConnect
            </DropdownMenu.Item>
            {!installed && (
              <DropdownMenu.Item asChild>
                <Link
                  href="/settings?tab=app"
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
                >
                  <Download className="h-4 w-4" />
                  Download app
                </Link>
              </DropdownMenu.Item>
            )}
            {profile?.isAdmin && (
              <DropdownMenu.Item asChild>
                <Link
                  href="/admin"
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item asChild>
              <Link
                href="/settings"
                className="block cursor-pointer rounded-lg px-3 py-2 text-sm text-chrome-foreground/80 outline-none hover:bg-chrome-muted hover:text-chrome-foreground"
              >
                Settings
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-chrome-muted" />
            <DropdownMenu.Item
              onClick={handleSignOut}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-signal-red outline-none hover:bg-signal-red/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <ShareAppSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </header>
  );
}
