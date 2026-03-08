"use client";

import React from "react";

import { CreatorApplyCard } from "@/components/mypage/CreatorApplyCard";
import {
  MyPageAccordion,
  type OpenSections,
  type SectionKey,
} from "@/components/mypage/MyPageAccordion";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import { UserUpdateForm } from "@/components/mypage/UserUpdateForm";

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

        {props.error && (
          <div className="alert-warn">
            <p className="text-xs">{props.error}</p>
          </div>
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

        <hr className="border-gray-200" />

        <CreatorApplyCard
          saving={props.saving}
          onApply={props.onApply}
        />
      </div>
    </MyPageShell>
  );
}
