"use client";

import React from "react";
import type { Address } from "viem";

import type { SnsProjectOption } from "@/lib/mypage/snsApi";
import { PostComposerCard } from "@/components/mypage/PostComposerCard";
import { MyPostsCard } from "@/components/mypage/MyPostsCard";
import { AiAgencyCard } from "@/components/mypage/AiAgencyCard";
import { AnalyticsSummaryCard } from "@/components/mypage/AnalyticsSummaryCard";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";

type Props = {
  address: Address | undefined;
  username: string;
  projectOptions: SnsProjectOption[];
};

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
        <AiAgencyCard
          address={props.address}
          refreshToken={refreshToken}
          onChanged={handleChanged}
        />
      </div>
    </div>
  );
}
