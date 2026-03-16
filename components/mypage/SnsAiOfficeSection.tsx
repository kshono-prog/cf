"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { Address } from "viem";

import type { SnsProjectOption } from "@/lib/mypage/snsApi";
import {
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";

type Props = {
  address: Address | undefined;
  username: string;
  projectOptions: SnsProjectOption[];
};

const PostComposerCard = dynamic(
  () =>
    import("@/components/mypage/PostComposerCard").then(
      (mod) => mod.PostComposerCard
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="投稿 composer を読み込んでいます" />
    ),
  }
);

const AnalyticsSummaryCard = dynamic(
  () =>
    import("@/components/mypage/AnalyticsSummaryCard").then(
      (mod) => mod.AnalyticsSummaryCard
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="analytics summary を読み込んでいます" />
    ),
  }
);

const MyPostsCard = dynamic(
  () =>
    import("@/components/mypage/MyPostsCard").then(
      (mod) => mod.MyPostsCard
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="投稿一覧を読み込んでいます" />
    ),
  }
);

const AiAgencyCard = dynamic(
  () =>
    import("@/components/mypage/AiAgencyCard").then(
      (mod) => mod.AiAgencyCard
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="AI 事務所の拡張を読み込んでいます" />
    ),
  }
);

export function SnsAiOfficeSection(props: Props) {
  const [refreshToken, setRefreshToken] = React.useState(0);

  const handleChanged = React.useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  return (
    <div className="space-y-4">
      <WorkspaceStatusNotice
        tone="info"
        title="投稿 -> 反応 -> 支援 -> AI運用の流れを同じ管理面で扱えます。"
        description="公開プロフィールの feed と post tip はそのまま維持しつつ、運営側の投稿と AI 事務所の土台だけをここに追加しています。"
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <PostComposerCard
          address={props.address}
          projectOptions={props.projectOptions}
          onCreated={handleChanged}
        />
        <AnalyticsSummaryCard
          address={props.address}
          refreshToken={refreshToken}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <MyPostsCard
          address={props.address}
          username={props.username}
          refreshToken={refreshToken}
          onPostsChanged={handleChanged}
        />
        <div id="sns-ai-office">
          <AiAgencyCard
            address={props.address}
            refreshToken={refreshToken}
            onChanged={handleChanged}
          />
        </div>
      </div>
    </div>
  );
}
