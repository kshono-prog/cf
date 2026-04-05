"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { EventDateTime } from "@/components/EventDateTime";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_OPTIONS,
  type EventCategory,
} from "@/lib/creatorTaxonomy";

type EventDto = {
  id: string;
  title: string;
  description?: string | null;
  date?: string | null; // ISO
  goalAmount?: number | null;
  categories?: EventCategory[];
  isPublished?: boolean;
};

type Props = {
  username: string;
  themeColor?: string;
  baseUrl?: string;
};

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function EventManager({
  username,
  themeColor,
  baseUrl = "",
}: Props) {
  const { address } = useAccount();
  // 変更系（作成/更新/削除）は既存 route.ts を利用
  const API_MUTATE = useMemo(
    () => `${baseUrl}/api/creators/${encodeURIComponent(username)}/events`,
    [baseUrl, username]
  );

  // 一覧取得だけ管理用（公開/非公開どちらも返す）
  const API_LIST = useMemo(
    () =>
      `${baseUrl}/api/creators/${encodeURIComponent(username)}/events/manage`,
    [baseUrl, username]
  );

  const [events, setEvents] = useState<EventDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========== 新規作成フォーム ==========
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createDate, setCreateDate] = useState(""); // datetime-local
  const [createGoal, setCreateGoal] = useState<string>("");
  const [createCategories, setCreateCategories] = useState<EventCategory[]>([]);
  const [createPublished, setCreatePublished] = useState(true);
  const [creating, setCreating] = useState(false);

  // ========== 編集フォーム（1件） ==========
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState(""); // datetime-local
  const [editGoal, setEditGoal] = useState<string>("");
  const [editCategories, setEditCategories] = useState<EventCategory[]>([]);
  const [editPublished, setEditPublished] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // ========== 削除 ==========
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!address) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const res = await ownerAuthFetch({
        address,
        url: API_LIST,
        init: { cache: "no-store" },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`EVENT_LIST_FAILED: ${res.status} ${t}`);
      }
      const data = (await res.json()) as { events?: EventDto[] };
      setEvents(data.events ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [API_LIST, address]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function resetCreateForm() {
    setCreateTitle("");
    setCreateDescription("");
    setCreateDate("");
    setCreateGoal("");
    setCreateCategories([]);
    setCreatePublished(true);
  }

  async function createEvent() {
    setError(null);

    if (!createTitle.trim() || !createDate) {
      setError("タイトルと開催日時は必須です。");
      return;
    }
    if (!address) {
      setError("ウォレット接続が必要です。");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        title: createTitle.trim(),
        description: createDescription || "",
        date: new Date(createDate).toISOString(),
        goalAmount: createGoal ? Number(createGoal) : null,
        categories: createCategories,
        isPublished: createPublished,
      };

      const res = await ownerAuthFetch({
        address,
        url: API_MUTATE,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`EVENT_CREATE_FAILED: ${res.status} ${t}`);
      }

      resetCreateForm();
      await reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(ev: EventDto) {
    setEditingId(ev.id);
    setEditTitle(ev.title ?? "");
    setEditDescription(ev.description ?? "");
    setEditGoal(typeof ev.goalAmount === "number" ? String(ev.goalAmount) : "");
    setEditCategories(ev.categories ?? []);
    setEditPublished(ev.isPublished ?? true);
    setEditDate(ev.date ? toDatetimeLocal(ev.date) : "");
  }

  function cancelEdit() {
    setEditingId(null);
    setSavingId(null);
  }

  async function saveEdit() {
    if (!editingId) return;

    setError(null);

    if (!editTitle.trim() || !editDate) {
      setError("タイトルと開催日時は必須です。");
      return;
    }
    if (!address) {
      setError("ウォレット接続が必要です。");
      return;
    }

    setSavingId(editingId);
    try {
      const payload = {
        id: editingId,
        title: editTitle.trim(),
        description: editDescription || "",
        date: new Date(editDate).toISOString(),
        goalAmount: editGoal ? Number(editGoal) : null,
        categories: editCategories,
        isPublished: editPublished,
      };

      const res = await ownerAuthFetch({
        address,
        url: API_MUTATE,
        init: {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`EVENT_UPDATE_FAILED: ${res.status} ${t}`);
      }

      await reload();
      setEditingId(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteEvent(id: string) {
    setError(null);

    const ok = confirm("このイベントを削除します。よろしいですか？");
    if (!ok) return;
    if (!address) {
      setError("ウォレット接続が必要です。");
      return;
    }

    setDeletingId(id);
    try {
      const res = await ownerAuthFetch({
        address,
        url: `${API_MUTATE}?id=${encodeURIComponent(id)}`,
        init: {
          method: "DELETE",
        },
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`EVENT_DELETE_FAILED: ${res.status} ${t}`);
      }

      if (editingId === id) setEditingId(null);

      await reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card p-4 bg-[var(--surface)] space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">イベント / ライブ情報の管理</h2>
          <p className="text-[11px] text-gray-500">
            新規作成・編集・削除をこの画面で管理できます（非公開も管理画面には表示されます）。
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={reload}
          disabled={loading}
        >
          {loading ? "更新中..." : "再読み込み"}
        </button>
      </div>

      {error && (
        <div className="alert-warn">
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* =========================
          新規イベント作成フォーム
         ========================= */}
      <div className="border rounded-md p-3 bg-[var(--surface)] space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">新規イベント登録</p>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
            style={{ backgroundColor: themeColor || "#005bbb" }}
          >
            NEW
          </span>
        </div>

        <div>
          <label className="block text-[11px] text-gray-600 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="例）Kyoto Jazz Night"
          />
        </div>

        <div>
          <label className="block text-[11px] text-gray-600 mb-1">
            開催日時 <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            className="input"
            value={createDate}
            onChange={(e) => setCreateDate(e.target.value)}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            入力した日時は自動的に ISO 形式として保存されます。
          </p>
        </div>

        <div>
          <label className="block text-[11px] text-gray-600 mb-1">
            目標金額（JPYC）
          </label>
          <input
            type="number"
            min={0}
            className="input"
            value={createGoal}
            onChange={(e) => setCreateGoal(e.target.value)}
            placeholder="例）10000"
          />
        </div>

        <div>
          <label className="block text-[11px] text-gray-600 mb-1">カテゴリ</label>
          <div className="flex flex-wrap gap-2">
            {EVENT_CATEGORY_OPTIONS.map((option) => {
              const selected = createCategories.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    selected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-[var(--line)] bg-[var(--surface)] text-gray-700"
                  }`}
                  disabled={
                    creating || (!selected && createCategories.length >= 5)
                  }
                  onClick={() =>
                    setCreateCategories((prev) =>
                      selected
                        ? prev.filter((item) => item !== option)
                        : [...prev, option]
                    )
                  }
                >
                  {EVENT_CATEGORY_LABELS[option]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-gray-600 mb-1">説明</label>
          <textarea
            className="input min-h-[70px]"
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            placeholder="例）会場、出演者、タイムテーブル、注意事項など"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="createPublished"
            type="checkbox"
            checked={createPublished}
            onChange={(e) => setCreatePublished(e.target.checked)}
          />
          <label htmlFor="createPublished" className="text-xs text-gray-700">
            公開する
          </label>
          {!createPublished && (
            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-200 text-gray-700">
              非公開で作成されます
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn flex-1"
            onClick={createEvent}
            disabled={creating}
          >
            {creating ? "登録中..." : "登録する"}
          </button>

          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={resetCreateForm}
            disabled={creating}
          >
            クリア
          </button>
        </div>
      </div>

      {/* =========================
          登録済みイベント一覧
         ========================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">登録済みイベント</p>
          <p className="text-[11px] text-gray-500">{events.length} 件</p>
        </div>

        {events.length === 0 ? (
          <p className="text-xs text-gray-500">イベントはまだありません。</p>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => {
              const isEditing = editingId === ev.id;
              const isPublished = ev.isPublished !== false;

              return (
                <div
                  key={ev.id}
                  className={`border rounded-md p-3 bg-[var(--surface)] ${
                    isPublished ? "" : "opacity-90"
                  }`}
                >
                  {!isEditing ? (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">
                            {ev.title}
                          </p>

                          {/* ✅ 非公開を分かりやすく表示 */}
                          {!isPublished ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-200 text-gray-700">
                              非公開
                            </span>
                          ) : (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
                              style={{
                                backgroundColor: themeColor || "#005bbb",
                              }}
                            >
                              公開中
                            </span>
                          )}
                        </div>

                        {ev.date && (
                          <p className="text-[11px] text-gray-500">
                            <EventDateTime
                              iso={ev.date}
                              options={{
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }}
                            />
                          </p>
                        )}

                        {typeof ev.goalAmount === "number" && (
                          <p className="text-[11px] text-gray-500">
                            目標：{ev.goalAmount.toLocaleString()} JPYC
                          </p>
                        )}

                        {ev.categories && ev.categories.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {ev.categories.map((category) => (
                              <span
                                key={`${ev.id}-${category}`}
                                className="rounded-full border border-gray-200 bg-[var(--surface)] px-2 py-0.5 text-[10px] text-gray-600"
                              >
                                {EVENT_CATEGORY_LABELS[category]}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {ev.description && (
                          <p className="text-xs text-gray-700 whitespace-pre-wrap mt-1">
                            {ev.description}
                          </p>
                        )}

                        {!isPublished && (
                          <p className="mt-1 text-[11px] text-gray-600">
                            ※ 非公開のため、公開ページには表示されません。
                          </p>
                        )}

                        <p className="mt-1 text-[10px] text-[var(--muted)]">
                          公開状態：{isPublished ? "公開" : "非公開"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => startEdit(ev)}
                          style={
                            themeColor
                              ? { borderColor: themeColor, color: themeColor }
                              : undefined
                          }
                        >
                          編集
                        </button>

                        <button
                          type="button"
                          className="text-xs text-red-600 underline"
                          onClick={() => deleteEvent(ev.id)}
                          disabled={deletingId === ev.id}
                        >
                          {deletingId === ev.id ? "削除中..." : "削除"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">イベント編集</p>
                        <span className="text-[10px] text-[var(--muted)]">
                          ID: {ev.id}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">
                          タイトル <span className="text-red-500">*</span>
                        </label>
                        <input
                          className="input"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">
                          開催日時 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          className="input"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">
                          目標金額（JPYC）
                        </label>
                        <input
                          type="number"
                          min={0}
                          className="input"
                          value={editGoal}
                          onChange={(e) => setEditGoal(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">
                          カテゴリ
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {EVENT_CATEGORY_OPTIONS.map((option) => {
                            const selected = editCategories.includes(option);
                            return (
                              <button
                                key={`${ev.id}-${option}`}
                                type="button"
                                className={`rounded-full border px-3 py-1 text-xs transition ${
                                  selected
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-[var(--line)] bg-[var(--surface)] text-gray-700"
                                }`}
                                disabled={
                                  savingId === ev.id ||
                                  (!selected && editCategories.length >= 5)
                                }
                                onClick={() =>
                                  setEditCategories((prev) =>
                                    selected
                                      ? prev.filter((item) => item !== option)
                                      : [...prev, option]
                                  )
                                }
                              >
                                {EVENT_CATEGORY_LABELS[option]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-gray-600 mb-1">
                          説明
                        </label>
                        <textarea
                          className="input min-h-[70px]"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id={`pub-${ev.id}`}
                          type="checkbox"
                          checked={editPublished}
                          onChange={(e) => setEditPublished(e.target.checked)}
                        />
                        <label
                          htmlFor={`pub-${ev.id}`}
                          className="text-xs text-gray-700"
                        >
                          公開する
                        </label>

                        {!editPublished && (
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-200 text-gray-700">
                            非公開（公開ページに出ません）
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          className="btn flex-1"
                          onClick={saveEdit}
                          disabled={savingId === ev.id}
                        >
                          {savingId === ev.id ? "保存中..." : "保存"}
                        </button>

                        <button
                          type="button"
                          className="btn-secondary flex-1"
                          onClick={cancelEdit}
                          disabled={savingId === ev.id}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
