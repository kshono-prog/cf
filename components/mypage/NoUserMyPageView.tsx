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
          title="ウォレット接続は完了しています"
          description="次はユーザー登録です。表示名とユーザー名を決めると、自分のページ準備と投稿の入口が使えるようになります。"
          nextActionTitle="まずは自分の基本情報を決める"
          nextActionBody="あとから直せるので、まずは公開してもよい表示名と短い自己紹介を入れて進めるのがおすすめです。"
        />

        {props.error && (
          <WorkspaceStatusNotice tone="error" title={props.error} />
        )}

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 space-y-1">
            <h2 className="text-sm font-semibold text-gray-900">
              ユーザー情報を整える
            </h2>
            <p className="text-xs leading-relaxed text-gray-600">
              ここで登録した内容が、自分のページの最初の見え方になります。あとからいつでも直せます。
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
