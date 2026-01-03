// components/mypage/CreatorApplyCard.tsx
"use client";

import React from "react";

type Props = {
  saving: boolean;
  onApply: () => void;
};

export function CreatorApplyCard({ saving, onApply }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">
        クリエイターとして投げ銭ページを公開する場合は、こちらから申請してください。
      </p>
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
