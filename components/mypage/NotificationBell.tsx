"use client";

import React from "react";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { NotificationItem, NotificationsOk } from "@/lib/notificationsApi";
import { Avatar } from "@/components/shared/Avatar";

const LAST_SEEN_KEY = "cf:notifications:lastSeenAt";

function useNotifications(address: string | undefined) {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetch = React.useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await ownerAuthFetch({
        address,
        url: `/api/notifications?address=${encodeURIComponent(address)}`,
      });
      if (!res.ok) return;
      const data = (await res.json()) as { ok: boolean; items?: NotificationItem[] };
      if (data.ok && Array.isArray(data.items)) {
        const parsed = (data as NotificationsOk).items;
        setItems(parsed);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [address]);

  return { items, loading, fetch };
}

function getLastSeenAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function saveLastSeenAt(ts: number): void {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, String(ts));
  } catch {
    // ignore
  }
}

function formatRelative(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes.toString()}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours.toString()}時間前`;
  const days = Math.floor(hours / 24);
  return `${days.toString()}日前`;
}

const KIND_COLORS: Record<string, string> = {
  REPLY: "bg-sky-50 text-sky-700 border-sky-200",
  LIKE: "bg-rose-50 text-rose-700 border-rose-200",
  SUPPORT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NOTICE: "bg-amber-50 text-amber-700 border-amber-200",
};
const KIND_LABELS: Record<string, string> = {
  REPLY: "返信",
  LIKE: "いいね",
  SUPPORT: "応援",
  NOTICE: "お知らせ",
};

function NotificationRow({ item, isUnread }: { item: NotificationItem; isUnread: boolean }) {
  const colorClass = KIND_COLORS[item.kind] ?? KIND_COLORS.NOTICE;
  const label = KIND_LABELS[item.kind] ?? item.kind;

  return (
    <a
      href={item.href}
      className={`flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition${
        isUnread ? " bg-sky-50/40" : ""
      }`}
    >
      {item.actor ? (
        <Avatar
          src={item.actor.avatarUrl}
          alt={item.actor.displayName}
          fallbackText={item.actor.displayName.slice(0, 1)}
          size={32}
        />
      ) : (
        <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">
          CF
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}
          >
            {label}
          </span>
          {isUnread ? (
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          ) : null}
          <span className="text-[10px] text-gray-400">{formatRelative(item.createdAt)}</span>
        </div>
        <div className="mt-0.5 truncate text-[12px] text-gray-700">{item.title}</div>
        {item.body ? (
          <div className="mt-0.5 truncate text-[11px] text-gray-500">{item.body}</div>
        ) : null}
        {item.meta ? (
          <div className="mt-0.5 text-[11px] text-gray-400">{item.meta}</div>
        ) : null}
      </div>
    </a>
  );
}

export function NotificationBell() {
  const workspace = useCreatorReadyWorkspace();
  const address = workspace.address;
  const { items, loading, fetch } = useNotifications(address);
  const [open, setOpen] = React.useState(false);
  const [lastSeenAt, setLastSeenAt] = React.useState<number>(0);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Load lastSeenAt from storage on mount
  React.useEffect(() => {
    setLastSeenAt(getLastSeenAt());
  }, []);

  // Fetch on mount if address is available
  React.useEffect(() => {
    if (address) {
      void fetch();
    }
  }, [address, fetch]);

  // Close panel on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unreadCount = React.useMemo(() => {
    return items.filter((item) => new Date(item.createdAt).getTime() > lastSeenAt).length;
  }, [items, lastSeenAt]);

  const handleOpen = React.useCallback(() => {
    setOpen((prev) => !prev);
    if (!open) {
      // Mark as seen
      const now = Date.now();
      saveLastSeenAt(now);
      setLastSeenAt(now);
      void fetch();
    }
  }, [open, fetch]);

  if (!address) return null;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition hover:border-gray-400 hover:text-gray-800"
        onClick={handleOpen}
        aria-label="通知"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount.toString()}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-[12px] font-semibold text-gray-700">通知</span>
            {loading ? (
              <span className="text-[10px] text-gray-400">読み込み中…</span>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {items.length === 0 && !loading ? (
              <div className="px-3 py-6 text-center text-[12px] text-gray-400">
                通知はありません
              </div>
            ) : (
              items.slice(0, 20).map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  isUnread={new Date(item.createdAt).getTime() > lastSeenAt}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
