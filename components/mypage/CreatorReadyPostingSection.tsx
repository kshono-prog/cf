"use client";

import dynamic from "next/dynamic";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { MyPageAccordion } from "@/components/mypage/MyPageAccordion";
import {
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import type { PostingProjectOption } from "@/lib/mypage/postingApi";

type Props = {
  projectOptions: PostingProjectOption[];
};

const PostingAiOfficeSection = dynamic(
  () =>
    import("@/components/mypage/PostingAiOfficeSection").then(
      (mod) => mod.PostingAiOfficeSection
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="投稿・AIアシスタント機能を読み込んでいます" />
    ),
  }
);

export function CreatorReadyPostingSection(props: Props) {
  const workspace = useCreatorReadyWorkspace();

  return (
    <div id="posting-compose" className="scroll-mt-24">
      <div id="sns-compose" className="scroll-mt-24" aria-hidden="true" />
      <MyPageAccordion
        open={workspace.openSections}
        onToggle={workspace.onToggleSection}
        sectionKey="sns"
        title="投稿・AIアシスタント"
      >
        <div className="mb-3">
          <WorkspaceStatusNotice
            tone="info"
            title="投稿の作成とAIによる提案作成を利用できます"
            description="公開ページの支援設定はそのままに、投稿管理とAIアシスタントをここからまとめて操作できます。"
          />
        </div>
        <PostingAiOfficeSection
          address={workspace.address}
          username={workspace.meCreatorUsername}
          projectOptions={props.projectOptions}
        />
      </MyPageAccordion>
    </div>
  );
}
