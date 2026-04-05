"use client";

import React from "react";

import { AiConciergeGuideCard } from "@/components/mypage/AiConciergeGuideCard";
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
import type { WorkspaceActionNotice } from "@/lib/mypage/workspaceActionCopy";

type Props = {
  headerColor: string;
  error: string | null;
  errorDescription?: string | null;
  notice?: WorkspaceActionNotice | null;
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
        <h1 className="text-lg font-semibold mb-2">設定</h1>

        <MyPageOnboardingProgress
          currentStep="APPLY"
          title="ユーザー登録は完了しています"
          description="次は公開ページを使う準備です。クリエイターとして申請すると、公開ページ、応援設定、投稿管理が使えるようになります。"
          nextActionTitle="公開してもよい見え方を先に整える"
          nextActionBody="表示名と紹介文を軽く整えてから進めると、公開ページの初期状態が分かりやすくなります。"
        />

        <AiConciergeGuideCard
          title="AIコンシェルジュが公開準備を案内します"
          body="クリエイター申請まで進むと、AI Office がプロフィール整備、最初の投稿、支援導線づくりを段階ごとに手伝えるようになります。"
          points={[
            {
              title: "見え方を整える",
              body: "表示名と紹介文を軽くそろえておくと、公開ページの初期印象が安定します。",
            },
            {
              title: "申請後の運営を知る",
              body: "公開ページ、応援設定、投稿管理、AI Office の運営導線が使えるようになります。",
            },
            {
              title: "最初の相談先を持つ",
              body: "申請後は AI コンシェルジュとして、最初の一歩や次にやることを提案できます。",
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
            <p className="text-xs text-[var(--muted)] whitespace-pre-wrap">
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

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              クリエイターとして公開する
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-subtle)]">
              申請後は、公開ページの編集、応援の受け取り、投稿、詳細設定などのクリエイター向け機能が使えるようになります。
            </p>
          </div>
          <CreatorApplyCard saving={props.saving} onApply={props.onApply} />
        </div>
      </div>
    </MyPageShell>
  );
}
