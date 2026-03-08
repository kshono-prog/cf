"use client";

import React from "react";

import { MyPageOnboardingProgress } from "@/components/mypage/MyPageOnboardingProgress";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { UserRegistrationForm } from "@/components/mypage/UserRegistrationForm";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";

type Props = {
  headerColor: string;
  error: string | null;
  usernameInput: string;
  displayName: string;
  profile: string;
  setUsernameInput: (v: string) => void;
  setDisplayName: (v: string) => void;
  setProfile: (v: string) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function NoUserMyPageView(props: Props) {
  return (
    <MyPageShell headerColor={props.headerColor}>
      <div className="container-narrow space-y-4">
        <h1 className="text-lg font-semibold mb-2">ユーザー登録</h1>

        <MyPageOnboardingProgress
          currentStep="REGISTER"
          title="まずはページの土台を作ります"
          description="この登録が完了すると、あなた専用のURLとマイページの基本設定が使えるようになります。"
          nextActionTitle="ページURLと表示名を決める"
          nextActionBody="このあとクリエイター申請に進むので、公開してもよい表示名と簡単な自己紹介を入れておくと次がスムーズです。"
        />

        {props.error && (
          <WorkspaceStatusNotice tone="error" title={props.error} />
        )}

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 space-y-1">
            <h2 className="text-sm font-semibold text-gray-900">
              Step 2. ユーザー登録
            </h2>
            <p className="text-xs leading-relaxed text-gray-600">
              あとから修正できますが、ここで入力した内容が公開ページの初期情報になります。
            </p>
          </div>
          <UserRegistrationForm
            usernameInput={props.usernameInput}
            displayName={props.displayName}
            profile={props.profile}
            setUsernameInput={props.setUsernameInput}
            setDisplayName={props.setDisplayName}
            setProfile={props.setProfile}
            saving={props.saving}
            onSubmit={props.onSubmit}
          />
        </div>
      </div>
    </MyPageShell>
  );
}
