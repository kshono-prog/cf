import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";

export type AiOfficeCreateSectionCopy = {
  title: string;
  description: string;
  helper: string;
};

const AI_OFFICE_CREATE_COPY_BY_ROLE: Record<
  CreatorAiAgentRole,
  AiOfficeCreateSectionCopy
> = {
  MANAGER: {
    title: "1. 参考情報を確認する",
    description:
      "Project、Goal、Summary、最近の投稿などをもとにAIが次の一手を整理します。",
    helper:
      "投稿がまだない場合でも次のアクション提案は使えます。告知系の下書きを作るときは、投稿後に精度が上がります。",
  },
  FINANCE: {
    title: "1. 参考情報を確認する",
    description:
      "Project、Summary、配分準備、最近の投稿などをもとにAIが下書きを作成します。",
    helper:
      "投稿がまだない場合でも配分や進捗整理の下書きは使えます。告知系の下書きを作るときは、投稿後に精度が上がります。",
  },
  PROMOTION: {
    title: "1. 投稿と反応を確認する",
    description:
      "このアプリ内の投稿と反応をもとにAIが告知や公開向けの下書きを作成します。",
    helper:
      "投稿がまだない場合でも下書きは作れます。公開向けの告知や紹介文は、投稿後に精度が上がります。",
  },
  FAN_RELATION: {
    title: "1. 投稿と反応を確認する",
    description:
      "最近の投稿と支援者向けの文脈をもとにAIが返信や案内の下書きを作成します。",
    helper:
      "投稿がまだない場合でも支援者向けの下書きは作れます。最近の投稿があると、文脈に合った案内を作りやすくなります。",
  },
};

export function getAiOfficeCreateSectionCopy(
  roleId: CreatorAiAgentRole | null | undefined
): AiOfficeCreateSectionCopy {
  if (!roleId) {
    return AI_OFFICE_CREATE_COPY_BY_ROLE.MANAGER;
  }

  return AI_OFFICE_CREATE_COPY_BY_ROLE[roleId];
}
