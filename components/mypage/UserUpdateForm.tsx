// components/mypage/UserUpdateForm.tsx
"use client";

import React from "react";

type Props = {
  displayName: string;
  profile: string;
  setDisplayName: (v: string) => void;
  setProfile: (v: string) => void;

  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function UserUpdateForm({
  displayName,
  profile,
  setDisplayName,
  setProfile,
  saving,
  onSubmit,
}: Props) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
        申請前に、公開してもよい表示名と自己紹介になっているかを確認します。
      </p>
      <div>
        <label className="block text-xs font-medium mb-1">表示名</label>
        <input
          type="text"
          className="input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={saving}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">プロフィール</label>
        <textarea
          className="input min-h-[80px]"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          disabled={saving}
        />
      </div>

      <button type="submit" className="btn-secondary w-full" disabled={saving}>
        {saving ? "更新中..." : "登録情報を保存する"}
      </button>
    </form>
  );
}
