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
        <p className="text-[11px] text-gray-500 mb-2">
          公開ページのURLになります。あとから変更しにくい前提で決めるのが安全です。
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
        <p className="text-[11px] text-gray-500 mb-2">
          支援ページやマイページで最初に見える名前です。
        </p>
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
        <p className="text-[11px] text-gray-500 mb-2">
          活動内容を一言でも入れておくと、次の申請や公開準備が進めやすくなります。
        </p>
        <textarea
          className="input min-h-[80px]"
          placeholder="簡単な自己紹介や活動内容を入力してください。"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          disabled={saving}
        />
      </div>

      <button type="submit" className="btn w-full" disabled={saving}>
        {saving ? "保存中..." : "登録して次へ進む"}
      </button>
    </form>
  );
}
