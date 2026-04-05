"use client";

import React from "react";
import { CreatorProfileEditBasicInfoSection } from "@/components/mypage/CreatorProfileEditBasicInfoSection";
import { CreatorProfileEditEventsSection } from "@/components/mypage/CreatorProfileEditEventsSection";
import { CreatorProfileEditPublicPageSection } from "@/components/mypage/CreatorProfileEditPublicPageSection";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

type Props = {
  assistantSection?: React.ReactNode;
  extraSections?: React.ReactNode;
};

export function CreatorProfileEditForm({
  assistantSection,
  extraSections,
}: Props) {
  const workspace = useCreatorReadyWorkspace();

  return (
    <form
      className="surface-card space-y-5 p-5 sm:p-6"
      onSubmit={workspace.onSubmitProfile}
    >
      <div>
        <h2 className="text-lg font-semibold text-[var(--text)]">
          基本情報と公開ページを編集
        </h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
          名前や紹介文、公開ページに出すリンクをまとめて整えます。
        </p>
      </div>

      {assistantSection}

      <CreatorProfileEditBasicInfoSection />
      <CreatorProfileEditPublicPageSection />
      <CreatorProfileEditEventsSection />

      {extraSections ? (
        <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="text-base font-semibold text-[var(--text)]">
            詳細な設定
          </div>
          <div className="space-y-3">{extraSections}</div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className="btn flex-1" disabled={workspace.saving}>
          {workspace.saving ? "保存中です" : "保存する"}
        </button>
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={workspace.onCancelEditProfile}
          disabled={workspace.saving}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
