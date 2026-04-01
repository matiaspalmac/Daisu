"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Check, Trash2, AtSign, UserPlus, MessageCircle, Sparkles, Trophy, Calendar, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType =
  | "mention"
  | "follow"
  | "dm_invite"
  | "ai_correction"
  | "achievement"
  | "event_reminder"
  | "system";

interface Notification {
  id: number | string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  mention: AtSign,
  follow: UserPlus,
  dm_invite: MessageCircle,
  ai_correction: Sparkles,
  achievement: Trophy,
  event_reminder: Calendar,
  system: Info,
};

// ─── Relative time helper ────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const { data: session } = useSession();
  const t = useTranslations("Notifications");

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch unread count (lightweight, polled every 30s) ──────────────────────

  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await apiFetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // silent — background poll
    }
  }, [session?.user]);

  // ── Fetch full notification list (on dropdown open) ─────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/notifications?unread_only=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : data.notifications ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  // ── Poll on mount ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session?.user) return;
    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUnreadCount, session?.user]);

  // ── Open dropdown → load notifications ─────────────────────────────────────

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // ── Close on outside click ──────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Mark single as read ─────────────────────────────────────────────────────

  const markRead = async (id: number | string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  };

  // ── Delete notification ─────────────────────────────────────────────────────

  const deleteNotification = async (id: number | string) => {
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => {
        const n = prev.find((n) => n.id === id);
        if (n && !n.is_read) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n.id !== id);
      });
    } catch {
      // silent
    }
  };

  // ── Mark all as read ────────────────────────────────────────────────────────

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // silent
    } finally {
      setMarkingAll(false);
    }
  };

  // Don't render if not logged in
  if (!session?.user) return null;

  const displayCount = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("bell")}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 bg-[var(--surface2)] text-[var(--text2)] hover:bg-[var(--surface3)] hover:text-[var(--text)]"
      >
        <Bell size={18} />
        {displayCount && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-[var(--primary)] text-white leading-none">
            {displayCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-12 w-80 rounded-2xl border border-[var(--border)] bg-[var(--surface)] z-50 overflow-hidden"
          style={{ boxShadow: "0 8px 32px var(--shadow)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <span className="font-semibold text-sm text-[var(--text)]">{t("title")}</span>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="text-xs text-[var(--primary)] hover:opacity-75 transition-opacity disabled:opacity-50 flex items-center gap-1"
              >
                <Check size={12} />
                {markingAll ? t("marking") : t("markAllRead")}
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-[var(--text3)]">{t("loading")}</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={28} className="mx-auto mb-2 text-[var(--text3)] opacity-40" />
                <p className="text-sm text-[var(--text3)]">{t("empty")}</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const Icon = TYPE_ICONS[n.type] ?? Info;
                  return (
                    <li
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--surface2)] ${!n.is_read ? "bg-[var(--surface2)]" : ""}`}
                    >
                      {/* Icon */}
                      <span className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface3)] text-[var(--primary)]">
                        <Icon size={15} />
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] leading-snug truncate">{n.title}</p>
                        <p className="text-xs text-[var(--text2)] mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-[var(--text3)] mt-1">{relativeTime(n.created_at)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex flex-col gap-1 mt-0.5">
                        {!n.is_read && (
                          <button
                            onClick={() => markRead(n.id)}
                            aria-label={t("markRead")}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--primary)] hover:bg-[var(--surface3)] transition-colors"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(n.id)}
                          aria-label={t("delete")}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text3)] hover:text-[#ef4444] hover:bg-[var(--surface3)] transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
