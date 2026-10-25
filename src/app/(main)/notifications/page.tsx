"use client";

import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useMarkAllNotificationsRead, useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/notifications/NotificationItem";

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { data: notifications, isLoading } = useNotifications(profile?.uid);
  const markAllRead = useMarkAllNotificationsRead(profile?.uid);

  useEffect(() => {
    if (notifications && notifications.some((n) => !n.read) && !markAllRead.isPending) {
      markAllRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-xl font-bold text-foreground">Notifications</h1>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && (!notifications || notifications.length === 0) && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-steel/30" />
          <p className="mt-3 text-sm text-steel/50">
            Nothing yet — likes, comments, and new followers will show up here.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {notifications?.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}
      </div>
    </div>
  );
}
