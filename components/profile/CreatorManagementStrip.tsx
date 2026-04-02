"use client";

import Link from "next/link";

type Props = {
  username: string;
};

export function CreatorManagementStrip({ username }: Props) {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 backdrop-blur-sm">
      <p className="text-xs text-[var(--text-subtle)]">
        ファンに見えているページです
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={`/${username}/mypage/settings`}
          className="btn-secondary btn-sm rounded-full"
        >
          設定・準備
        </Link>
        <Link
          href={`/${username}/mypage`}
          className="btn btn-sm rounded-full"
        >
          管理に戻る →
        </Link>
      </div>
    </div>
  );
}
