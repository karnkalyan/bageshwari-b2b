"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ShoppingCart,
  FileText,
  Warehouse,
  Truck,
  CreditCard,
  Package,
  History,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  createdAt: string;
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch {
      // Ignore network errors in background polling
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Polling every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: NotificationItem) => {
    // Mark as read in background
    if (notif.status !== "READ") {
      fetch(`/api/notifications/${notif.id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, status: "READ" } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setIsOpen(false);

    if (notif.linkUrl) {
      router.push(notif.linkUrl);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ" })));
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === "unread" ? n.status !== "READ" : true
  );

  const getNotificationIcon = (title: string, linkUrl?: string | null) => {
    const lower = `${title} ${linkUrl || ""}`.toLowerCase();
    if (lower.includes("order") || lower.includes("cart")) {
      return <ShoppingCart className="h-4 w-4 text-blue-600" />;
    }
    if (lower.includes("invoice") || lower.includes("proforma") || lower.includes("pi")) {
      return <FileText className="h-4 w-4 text-purple-600" />;
    }
    if (lower.includes("pick") || lower.includes("warehouse")) {
      return <Warehouse className="h-4 w-4 text-teal-600" />;
    }
    if (lower.includes("ship") || lower.includes("dispatch") || lower.includes("challan") || lower.includes("transit")) {
      return <Truck className="h-4 w-4 text-amber-600" />;
    }
    if (lower.includes("payment") || lower.includes("credit") || lower.includes("paid")) {
      return <CreditCard className="h-4 w-4 text-emerald-600" />;
    }
    if (lower.includes("revision") || lower.includes("re-confirm")) {
      return <History className="h-4 w-4 text-amber-600" />;
    }
    return <Bell className="h-4 w-4 text-primary" />;
  };

  const formatRelativeTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open notifications"
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-extrabold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <>
          {/* Mobile backdrop to easily tap outside */}
          <div
            className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-2xs sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className={cn(
              "fixed inset-x-3 top-[68px] sm:top-full sm:absolute sm:inset-x-auto sm:right-0 sm:mt-2",
              "w-auto sm:w-96 max-w-[calc(100vw-24px)] sm:max-w-none",
              "rounded-2xl sm:rounded-xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden",
              "animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[82vh] sm:max-h-[500px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 font-bold">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={loading}
                    className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1 text-slate-400 hover:text-slate-700 rounded-md transition"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-100 px-3 bg-white text-xs shrink-0">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`py-2 px-3 text-[11px] font-semibold border-b-2 transition ${
                  filter === "all"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`py-2 px-3 text-[11px] font-semibold border-b-2 transition ${
                  filter === "unread"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-[calc(80vh-110px)] sm:max-h-[380px]">
              {filteredNotifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 space-y-1">
                  <Bell className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                  <div className="font-semibold text-slate-600">All caught up!</div>
                  <div className="text-[10px]">No {filter === "unread" ? "unread" : ""} notifications.</div>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isUnread = notif.status !== "READ";
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        "w-full p-3 text-left transition flex items-start gap-3 hover:bg-slate-50 relative group",
                        isUnread ? "bg-blue-50/40" : "bg-white"
                      )}
                    >
                      {/* Icon Container */}
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 shrink-0 group-hover:bg-white group-hover:shadow-2xs transition">
                        {getNotificationIcon(notif.title, notif.linkUrl)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn("text-xs truncate", isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700")}>
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {/* Unread indicator dot */}
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
