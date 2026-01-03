// components/mypage/UserRegistrationForm.tsx
"use client";

import React from "react";
import { withBaseUrl } from "@/utils/baseUrl";

type Props = {
  usernameInput: string;
  displayName: string;
  profile: string;

  setUsernameInput: (v: string) => void;
  setDisplayName: (v: string) => void;
  setProfile: (v: string) => void;

  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function UserRegistrationForm({
  usernameInput,
  displayName,
  profile,
  setUsernameInput,
  setDisplayName,
  setProfile,
  saving,
  onSubmit,
}: Props) {
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div>
        <label className="block text-xs font-medium mb-1">
          ページURL（ユーザーID） <span className="text-red-500">*</span>
        </label>
        <p className="text-[11px] text-gray-500 mb-1">
          あなたのページURLは：
          <span className="font-mono">
            {withBaseUrl(usernameInput || "your-id")}
          </span>
        </p>
        <input
          type="text"
          className="input"
          placeholder="例）creatorfounding"
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          required
          disabled={saving}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">
          表示名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="input"
          placeholder="例）CreatorFounding"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          disabled={saving}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">プロフィール</label>
        <textarea
          className="input min-h-[80px]"
          placeholder="簡単な自己紹介や活動内容を入力してください。"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          disabled={saving}
        />
      </div>

      <button type="submit" className="btn w-full" disabled={saving}>
        {saving ? "保存中..." : "ユーザー登録する"}
      </button>
    </form>
  );
}
