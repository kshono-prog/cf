"use client";

import type { FormEvent } from "react";

export type RewardTierFormState = {
  title: string;
  description: string;
  priceJpyc: string;
  quantityLimit: string;
  isPublished: boolean;
  sortOrder: string;
  deliveryType: string;
  imageUrl: string;
  startThresholdType: "" | "COUNT" | "AMOUNT";
  startThresholdValue: string;
};

export const emptyRewardTierFormState: RewardTierFormState = {
  title: "",
  description: "",
  priceJpyc: "",
  quantityLimit: "",
  isPublished: false,
  sortOrder: "0",
  deliveryType: "",
  imageUrl: "",
  startThresholdType: "",
  startThresholdValue: "",
};

type Props = {
  form: RewardTierFormState;
  saving: boolean;
  editingTierId: string | null;
  onChange: (next: RewardTierFormState) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  message?: string | null;
};

export function RewardTierEditorCard({
  form,
  saving,
  editingTierId,
  onChange,
  onSubmit,
  onCancel,
  message,
}: Props) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const setField = <K extends keyof RewardTierFormState>(
    key: K,
    value: RewardTierFormState[K]
  ) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-strong)]">
          {editingTierId ? "支援メニューを編集" : "支援メニューを追加"}
        </h3>
        {editingTierId && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] text-[var(--text-subtle)] underline"
          >
            編集をキャンセル
          </button>
        ) : null}
      </div>

      <label className="block text-[11px] font-medium text-[var(--text-subtle)]">
        タイトル
        <input
          className="mt-1 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          required
        />
      </label>

      <label className="block text-[11px] font-medium text-[var(--text-subtle)]">
        説明
        <textarea
          className="mt-1 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          rows={2}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] font-medium text-[var(--text-subtle)]">
          価格 (JPYC)
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
            value={form.priceJpyc}
            onChange={(e) => setField("priceJpyc", e.target.value)}
            required
          />
        </label>

        <label className="block text-[11px] font-medium text-[var(--text-subtle)]">
          受付数上限 (任意)
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
            value={form.quantityLimit}
            onChange={(e) => setField("quantityLimit", e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] font-medium text-[var(--text-subtle)]">
          開始条件タイプ
          <select
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
            value={form.startThresholdType}
            onChange={(e) =>
              setField(
                "startThresholdType",
                e.target.value as RewardTierFormState["startThresholdType"]
              )
            }
          >
            <option value="">なし</option>
            <option value="COUNT">件数で開始</option>
            <option value="AMOUNT">金額で開始</option>
          </select>
        </label>
        <label className="block text-[11px] font-medium text-[var(--text-subtle)]">
          開始条件値
          <input
            type="number"
            min={0}
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
            value={form.startThresholdValue}
            onChange={(e) => setField("startThresholdValue", e.target.value)}
            disabled={form.startThresholdType === ""}
            required={form.startThresholdType !== ""}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] font-medium text-[var(--text-subtle)]">
          配送タイプ (任意)
          <input
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
            value={form.deliveryType}
            onChange={(e) => setField("deliveryType", e.target.value)}
            placeholder="デジタル/物販/体験など"
          />
        </label>
        <label className="block text-[11px] font-medium text-[var(--text-subtle)]">
          画像 URL (任意)
          <input
            className="mt-1 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
            value={form.imageUrl}
            onChange={(e) => setField("imageUrl", e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[12px] text-[var(--text-subtle)]">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => setField("isPublished", e.target.checked)}
          />
          公開する
        </label>
        <label className="flex items-center gap-2 text-[12px] text-[var(--text-subtle)]">
          並び順
          <input
            type="number"
            className="w-16 rounded-lg border border-[var(--line)] px-2 py-1 text-sm"
            value={form.sortOrder}
            onChange={(e) => setField("sortOrder", e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        {message ? (
          <span className="text-[11px] text-[var(--text-subtle)]">
            {message}
          </span>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--accent,#2563eb)] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
        >
          {saving
            ? "保存中…"
            : editingTierId
              ? "変更を保存"
              : "支援メニューを追加"}
        </button>
      </div>
    </form>
  );
}
