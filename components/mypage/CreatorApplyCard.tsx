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
          この申請を行うと、公開ページの編集や応援設定を使えるようになります。名前と紹介文を確認してから進めてください。
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
