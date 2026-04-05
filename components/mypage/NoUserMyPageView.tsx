"use client";

import React from "react";

import { AiConciergeGuideCard } from "@/components/mypage/AiConciergeGuideCard";
import { MyPageOnboardingProgress } from "@/components/mypage/MyPageOnboardingProgress";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { UserRegistrationForm } from "@/components/mypage/UserRegistrationForm";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import type { WorkspaceActionNotice } from "@/lib/mypage/workspaceActionCopy";

type Props = {
  headerColor: string;
  error: string | null;
  errorDescription?: string | null;
  notice?: WorkspaceActionNotice | null;
  assistantSection?: React.ReactNode;
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

        <AiConciergeGuideCard
          title="AIコンシェルジュの準備ガイド"
          body="この段階では、公開してよい基本情報を先に整えるのが近道です。クリエイター申請まで進むと、AI Office がプロフィール整備や最初の投稿準備も案内します。"
          points={[
            {
              title: "表示名を決める",
              body: "あとから直せるので、まずは公開してよい名前を置いて進められます。",
            },
            {
              title: "短い紹介を書く",
              body: "一文あるだけで、自分のページの初期状態がかなり分かりやすくなります。",
            },
            {
              title: "次の段階を知る",
              body: "ユーザー登録の次はクリエイター申請です。そこで AI Office の運営補助が使えるようになります。",
            },
          ]}
        />

        {props.error && (
          <WorkspaceStatusNotice
            tone="error"
            title={props.error}
            description={props.errorDescription ?? undefined}
          />
        )}

        {props.notice ? (
          <WorkspaceStatusNotice
            tone={props.notice.tone}
            title={props.notice.title}
            description={props.notice.description}
          />
        ) : null}

        {props.assistantSection}

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="mb-3 space-y-1">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              ユーザー情報を整える
            </h2>
            <p className="text-xs leading-relaxed text-[var(--text-subtle)]">
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
