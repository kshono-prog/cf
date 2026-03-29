// components/mypage/CreatorApplyCard.tsx
"use client";

import React from "react";

type Props = {
  saving: boolean;
  onApply: () => void;
};

export function CreatorApplyCard({ saving, onApply }: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/70 bg-white px-3 py-3">
        <div className="text-xs font-semibold tracking-[0.12em] text-emerald-700">
          公開ページの準備
        </div>
        <p className="mt-1 text-xs leading-relaxed text-gray-700">
          申請すると、公開用のクリエイターページ作成フローに進めるようになります。名前と紹介文を確認してから進めてください。
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
          あとでプロフィールや目標は編集できます。
        </p>
      </div>
      <button
        type="button"
        className="btn w-full"
        onClick={onApply}
        disabled={saving}
      >
        {saving ? "申請中..." : "クリエイターとして申請する"}
      </button>
    </div>
  );
}
