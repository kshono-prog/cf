"use client";
import { useEffect, useState } from "react";

type LogItem = {
  id: string;
  occurredAt: string;
  eventType: string;
  message: string;
};

type ApiResponse = {
  ok: boolean;
  items: LogItem[];
  nextCursor: string | null;
};

export function RpgActivityLog() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rpg/activity-logs?limit=20")
      .then((r) => r.json())
      .then((d: unknown) => {
        const resp = d as ApiResponse;
        if (resp.ok) {
          setItems(resp.items);
          setNextCursor(resp.nextCursor);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function loadMore() {
    if (!nextCursor) return;
    fetch(`/api/rpg/activity-logs?limit=20&cursor=${nextCursor}`)
      .then((r) => r.json())
      .then((d: unknown) => {
        const resp = d as ApiResponse;
        if (resp.ok) {
          setItems((prev) => [...prev, ...resp.items]);
          setNextCursor(resp.nextCursor);
        }
      });
  }

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">活動ログ</h3>
      {loading && <div className="text-xs text-gray-400">読み込み中...</div>}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 text-xs">
            <span className="text-gray-400 shrink-0">
              {new Date(item.occurredAt).toLocaleDateString("ja-JP")}
            </span>
            <span className="text-gray-700 dark:text-gray-300">{item.message}</span>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-xs text-gray-400">活動ログがありません</div>
        )}
      </div>
      {nextCursor && (
        <button
          onClick={loadMore}
          className="w-full text-xs text-indigo-500 hover:text-indigo-600 py-1"
        >
          もっと見る
        </button>
      )}
    </div>
  );
}
