"use client";

import { useState, useTransition } from "react";
import { NOTIFICATION_ICONS, NotificationType } from "@/lib/constants";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell({
  notifications,
  unreadCount,
  markOneAction,
  markAllAction,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  markOneAction: (id: string) => Promise<void>;
  markAllAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full border border-white/30 text-white/90 text-xs font-medium w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-40 w-80 max-h-96 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => markAllAction())}
                  className="text-xs text-[#2f6f8f] hover:underline disabled:opacity-50"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Aucune notification.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`p-3 flex items-start gap-2 ${n.isRead ? "opacity-60" : "bg-amber-50/50"}`}
                  >
                    <span className="text-base shrink-0">{NOTIFICATION_ICONS[n.type as NotificationType] ?? "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700">{n.message}</p>
                    </div>
                    {!n.isRead && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => startTransition(() => markOneAction(n.id))}
                        className="text-[10px] text-slate-400 hover:text-slate-600 shrink-0"
                        title="Marquer comme lu"
                      >
                        ✓
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
