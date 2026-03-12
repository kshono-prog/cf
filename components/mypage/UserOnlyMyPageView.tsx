"use client";

import React from "react";

import { CreatorApplyCard } from "@/components/mypage/CreatorApplyCard";
import {
  MyPageAccordion,
  type OpenSections,
  type SectionKey,
} from "@/components/mypage/MyPageAccordion";
import { MyPageOnboardingProgress } from "@/components/mypage/MyPageOnboardingProgress";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { UserUpdateForm } from "@/components/mypage/UserUpdateForm";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";

type Props = {
  headerColor: string;
  error: string | null;
  openSections: OpenSections;
  onToggleSection: (key: SectionKey) => void;
  userDisplayName: string | null | undefined;
  userProfile: string | null | undefined;
  displayName: string;
  profile: string;
  setDisplayName: (value: string) => void;
  setProfile: (value: string) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onApply: () => void;
};

export function UserOnlyMyPageView(props: Props) {
  return (
    <MyPageShell headerColor={props.headerColor}>
      <div className="container-narrow space-y-4">
        <h1 className="text-lg font-semibold mb-2">マイページ</h1>

        <MyPageOnboardingProgress
          currentStep="APPLY"
          title="ユーザー登録は完了しています"
          description="次は公開前のプロフィールを確認して、クリエイターとして申請します。申請後にプロフィールと支援設定、下書きと承認を使えるようになります。"
          nextActionTitle="プロフィールを確認してから申請する"
          nextActionBody="表示名と自己紹介を整えたあとで申請すると、公開ページや管理画面の初期状態が分かりやすくなります。"
        />

        {props.error && (
          <WorkspaceStatusNotice tone="error" title={props.error} />
        )}

        <MyPageAccordion
          open={props.openSections}
          onToggle={props.onToggleSection}
          sectionKey="about"
          title="現在の登録情報"
        >
          <div className="space-y-2">
            <p className="text-sm">
              表示名：{props.userDisplayName ?? "（未設定）"}
            </p>
            <p className="text-xs text-gray-500 whitespace-pre-wrap">
              プロフィール：{props.userProfile ?? "（未設定）"}
            </p>
          </div>
        </MyPageAccordion>

        <MyPageAccordion
          open={props.openSections}
          onToggle={props.onToggleSection}
          sectionKey="wallet"
          title="ユーザー情報の更新"
        >
          <UserUpdateForm
            displayName={props.displayName}
            profile={props.profile}
            setDisplayName={props.setDisplayName}
            setProfile={props.setProfile}
            saving={props.saving}
            onSubmit={props.onSubmit}
          />
        </MyPageAccordion>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Step 3. クリエイター申請
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-700">
              申請後は、プロフィール編集、プロフィールと支援設定、下書きと承認、精算と詳細設定などのクリエイター向け機能が利用可能になります。
            </p>
          </div>
          <CreatorApplyCard saving={props.saving} onApply={props.onApply} />
        </div>
      </div>
    </MyPageShell>
  );
}
