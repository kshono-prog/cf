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
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
          Ready Check
        </div>
        <p className="mt-1 text-xs leading-relaxed text-gray-700">
          この申請を行うと、クリエイター管理画面が有効になります。公開前に表示名とプロフィールを確認してから進めてください。
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
