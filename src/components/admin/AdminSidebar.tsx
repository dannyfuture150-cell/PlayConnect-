"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, FileText, Flag, LayoutDashboard, Megaphone, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/posts", label: "Posts", icon: FileText, exact: false },
  { href: "/admin/competitions", label: "Competitions", icon: Trophy, exact: false },
  { href: "/admin/reports", label: "Reports", icon: Flag, exact: false },
  { href: "/admin/ads", label: "Ads", icon: Megaphone, exact: false },
];

/** Left sidebar on desktop; a compact scrolling tab bar across the top on phones. */
const ADMIN_ONLY = process.env.NEXT_PUBLIC_ADMIN_ONLY === "true";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile */}
      <header className="sticky top-0 z-30 border-b border-chrome-border bg-chrome md:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <div>
            <p className="font-display text-sm font-bold text-chrome-foreground">PlayConnect Admin</p>
          </div>
          {!ADMIN_ONLY && (
            <Link href="/feed" className="flex items-center gap-1.5 text-xs font-medium text-chrome-foreground/60">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to app
            </Link>
          )}
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-3 py-3 scrollbar-none">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium",
                  active ? "bg-chrome-muted text-chrome-foreground" : "text-chrome-foreground/60"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-violet-glow")} />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-chrome-border bg-chrome px-3 py-6 md:flex">
        <div className="mb-4 px-2">
          <p className="font-display text-sm font-bold text-chrome-foreground">PlayConnect</p>
          <p className="text-[11px] uppercase tracking-wide text-chrome-foreground/40">Admin</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname?.startsWith(href);
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
                <Icon className={cn("h-[18px] w-[18px]", active && "text-violet-glow")} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className={cn("mt-auto", ADMIN_ONLY && "hidden")}>
          <Link
            href="/feed"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-chrome-foreground/50 hover:bg-chrome-muted hover:text-chrome-foreground"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
            Back to app
          </Link>
        </div>
      </aside>
    </>
  );
}
