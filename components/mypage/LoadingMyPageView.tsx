"use client";

import React from "react";

import { MyPageShell } from "@/components/mypage/MyPageShell";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";

type Props = {
  headerColor: string;
};

export function LoadingMyPageView({ headerColor }: Props) {
  return (
    <MyPageShell headerColor={headerColor}>
      <div className="container-narrow">
        <WorkspaceStatusNotice
          tone="info"
          title="設定を読み込み中です"
          description="ウォレット接続とアプリ認証、プロフィール情報を順番に確認しています。"
        />
      </div>
    </MyPageShell>
  );
}
