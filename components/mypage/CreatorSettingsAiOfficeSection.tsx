"use client";

import { CreatorWorkspaceAiOfficePanel } from "@/components/mypage/CreatorWorkspaceAiOfficePanel";

type Props = {
  workspaceBasePath: string;
};

export function CreatorSettingsAiOfficeSection(props: Props) {
  return (
    <section id="ai-office-phase1" className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            AIアシスタント
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            告知文や返信の下書きを自動生成し、確認してから使えます。承認待ちの提案があればここで確認できます。
          </p>
        </div>
        <a
          href={`${props.workspaceBasePath}/supporters`}
          className="btn-secondary"
        >
          提案を確認する
        </a>
      </div>
      <div className="mt-4 surface-subtle px-4 py-4">
        <div className="text-sm font-semibold text-[var(--text)]">
          AIが提案・下書きを作成します。承認するまで自動投稿や送金は行いません。
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
          内容を確認して承認または却下することで、実際の動作に反映されます。
        </p>
      </div>
      <div className="mt-4">
        <CreatorWorkspaceAiOfficePanel />
      </div>
    </section>
  );
}
