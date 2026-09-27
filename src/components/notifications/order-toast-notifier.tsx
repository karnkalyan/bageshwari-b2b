"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  FileText,
  Truck,
  CreditCard,
  Warehouse,
  Bell,
  X,
  ExternalLink,
  History,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  createdAt: string;
  dismissing?: boolean;
}

const TOAST_DURATION = 6000;
const POLL_INTERVAL = 12000;
const MAX_VISIBLE_TOASTS = 4;

function getToastIcon(title: string, linkUrl?: string | null) {
  const lower = `${title} ${linkUrl || ""}`.toLowerCase();
  if (lower.includes("order") || lower.includes("cart")) {
    return <ShoppingCart className="h-5 w-5 text-blue-500" />;
  }
  if (lower.includes("invoice") || lower.includes("proforma") || lower.includes("pi")) {
    return <FileText className="h-5 w-5 text-purple-500" />;
  }
  if (lower.includes("pick") || lower.includes("warehouse")) {
    return <Warehouse className="h-5 w-5 text-teal-500" />;
  }
  if (lower.includes("ship") || lower.includes("dispatch") || lower.includes("challan") || lower.includes("transit")) {
    return <Truck className="h-5 w-5 text-amber-500" />;
  }
  if (lower.includes("payment") || lower.includes("credit") || lower.includes("paid")) {
    return <CreditCard className="h-5 w-5 text-emerald-500" />;
  }
  if (lower.includes("revision") || lower.includes("re-confirm")) {
    return <History className="h-5 w-5 text-amber-500" />;
  }
  if (lower.includes("pack")) {
    return <Package className="h-5 w-5 text-orange-500" />;
  }
  return <Bell className="h-5 w-5 text-blue-500" />;
}

function getToastAccent(title: string, linkUrl?: string | null) {
  const lower = `${title} ${linkUrl || ""}`.toLowerCase();
  if (lower.includes("order") || lower.includes("cart")) return "border-l-blue-500";
  if (lower.includes("invoice") || lower.includes("proforma")) return "border-l-purple-500";
  if (lower.includes("pick") || lower.includes("warehouse")) return "border-l-teal-500";
  if (lower.includes("ship") || lower.includes("dispatch")) return "border-l-amber-500";
  if (lower.includes("payment") || lower.includes("credit")) return "border-l-emerald-500";
  if (lower.includes("revision")) return "border-l-amber-500";
  return "border-l-blue-500";
}

function formatTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function OrderToastNotifier() {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialFetchDone = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const handleToastClick = useCallback(
    (toast: ToastNotification) => {
      // Mark as read in background
      fetch(`/api/notifications/${toast.id}/read`, { method: "POST" }).catch(() => {});
      dismissToast(toast.id);
      if (toast.linkUrl) {
        router.push(toast.linkUrl);
      }
    },
    [router, dismissToast]
  );

  // Auto-dismiss toasts after duration
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    toasts.forEach((t) => {
      if (!t.dismissing) {
        const timer = setTimeout(() => dismissToast(t.id), TOAST_DURATION);
        timers.push(timer);
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  // Poll for new notifications
  useEffect(() => {
    const fetchAndShow = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success || !json.data?.notifications) return;

        const allNotifs = json.data.notifications as Array<{
          id: string;
          title: string;
          message: string;
          linkUrl?: string | null;
          status: string;
          createdAt: string;
        }>;

        // On first fetch, just mark all current IDs as seen (don't spam toasts)
        if (!initialFetchDone.current) {
          allNotifs.forEach((n) => seenIdsRef.current.add(n.id));
          initialFetchDone.current = true;
          return;
        }

        // Find truly new unread notifications we haven't shown yet
        const newNotifs = allNotifs.filter(
          (n) => n.status !== "READ" && !seenIdsRef.current.has(n.id)
        );

        if (newNotifs.length > 0) {
          // Play notification sound (browser-safe)
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoKQcVg6T2uLnI1lTUJfc4eDclpGT2d7fHFkV1Rgb3ZxZ2BYXGlxb2hmYmBkam1ramdjZGZpamppaGdmaWlpamlpaWlpaQ==");
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}

          const toastsToAdd: ToastNotification[] = newNotifs
            .slice(0, MAX_VISIBLE_TOASTS)
            .map((n) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              linkUrl: n.linkUrl,
              createdAt: n.createdAt,
            }));

          newNotifs.forEach((n) => seenIdsRef.current.add(n.id));

          setToasts((prev) => {
            const combined = [...toastsToAdd, ...prev];
            return combined.slice(0, MAX_VISIBLE_TOASTS);
          });
        }
      } catch {
        // Silently ignore network errors
      }
    };

    fetchAndShow();
    const interval = setInterval(fetchAndShow, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-[72px] right-4 z-[100] flex flex-col gap-2.5 w-[380px] max-w-[calc(100vw-32px)] pointer-events-none"
    >
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border-l-4 transition-all duration-300",
            getToastAccent(toast.title, toast.linkUrl),
            toast.dismissing ? "toast-exit" : "toast-enter"
          )}
          style={{ animationDelay: toast.dismissing ? "0ms" : `${index * 80}ms` }}
        >
          {/* Progress bar countdown */}
          <div className="h-0.5 bg-slate-100 dark:bg-slate-800 w-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 origin-left"
              style={{
                animation: `toast-progress ${TOAST_DURATION}ms linear forwards`,
              }}
            />
          </div>

          <div className="p-3.5 flex items-start gap-3">
            {/* Icon */}
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800">
              {getToastIcon(toast.title, toast.linkUrl)}
            </div>

            {/* Content */}
            <div
              className={cn(
                "flex-1 min-w-0",
                toast.linkUrl && "cursor-pointer"
              )}
              onClick={() => handleToastClick(toast)}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {toast.title}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                  {formatTime(toast.createdAt)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                {toast.message}
              </p>
              {toast.linkUrl && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1.5 hover:underline">
                  <ExternalLink className="h-3 w-3" />
                  View Details
                </span>
              )}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissToast(toast.id);
              }}
              className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
