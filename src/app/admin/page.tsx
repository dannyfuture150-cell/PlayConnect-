"use client";

import Link from "next/link";
import { Users, UserX, Flag, FileText, Trophy, Gamepad2, UserPlus, Medal, Swords } from "lucide-react";
import { useAdminStats } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatCount } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  href,
}: {
  icon: any;
  label: string;
  value: number | string;
  sub?: string;
  tone?: string;
  href?: string;
}) {
  const body = (
    <Card className="p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-2 text-steel/50">
        <Icon className={`h-4 w-4 ${tone ?? ""}`} />
        <p className="text-[11px] font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-steel/50">{sub}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-steel/50">Platform overview.</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={Users} label="Total users" value={formatCount(stats.totalUsers)} href="/admin/users" />
            <StatCard icon={UserPlus} label="New (7 days)" value={formatCount(stats.newUsers7d)} tone="text-emerald-400" />
            <StatCard icon={Medal} label="Organisers" value={formatCount(stats.organisers)} />
            <StatCard icon={UserX} label="Banned" value={formatCount(stats.bannedUsers)} tone="text-signal-red" href="/admin/users" />
            <StatCard
              icon={Flag}
              label="Open reports"
              value={formatCount(stats.openReports)}
              tone="text-amber-400"
              href="/admin/reports"
            />
            <StatCard
              icon={FileText}
              label="Posts"
              value={formatCount(stats.totalPosts)}
              sub={`${stats.posts24h} in the last 24h`}
              href="/admin/posts"
            />
            <StatCard icon={Trophy} label="Tournaments" value={formatCount(stats.totalTournaments)} href="/admin/competitions" />
            <StatCard icon={Swords} label="Leagues" value={formatCount(stats.totalLeagues)} href="/admin/competitions" />
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-foreground">Newest members</h2>
              <Link href="/admin/users" className="text-xs text-violet-glow hover:underline">
                View all
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {stats.recentUsers.map((u) => (
                <div key={u.uid} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.photoURL ?? undefined} alt={u.displayName} />
                    <AvatarFallback>{u.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{u.displayName}</p>
                    <p className="truncate text-xs text-steel/50">@{u.username || "not set up yet"}</p>
                  </div>
                  {u.accountType === "organizer" && (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-steel/60">Organiser</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <p className="text-xs text-steel/40">
            Advertising and revenue aren&apos;t included — there&apos;s no ad or payment system to report on yet.
          </p>
        </>
      )}
    </div>
  );
}
