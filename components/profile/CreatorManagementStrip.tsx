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
          className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--text)] transition hover:border-[var(--text-subtle)] hover:text-[var(--text)]"
        >
          設定・準備
        </Link>
        <Link
          href={`/${username}/mypage`}
          className="rounded-full bg-[var(--text)] px-3 py-1 text-xs font-semibold text-[var(--bg)] transition hover:opacity-80"
        >
          管理に戻る →
        </Link>
      </div>
    </div>
  );
}
