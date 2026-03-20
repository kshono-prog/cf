"use client";

import { buildAiOfficePanelHref } from "@/components/mypage/aiOfficePanelUrlState";
import { CreatorWorkspaceAiOfficePanel } from "@/components/mypage/CreatorWorkspaceAiOfficePanel";
import { AI_OFFICE_LABEL } from "@/lib/uxCopy";

type Props = {
  workspaceBasePath: string;
};

export function CreatorSettingsAiOfficeSection(props: Props) {
  const aiOfficeInboxHref = buildAiOfficePanelHref({
    pathname: props.workspaceBasePath,
    hash: "#ai-office-phase1",
    currentSearchParams: new URLSearchParams(),
    state: {
      activeView: "INBOX",
      selectedRoleId: "MANAGER",
      selectedInboxRoleId: null,
    },
  });

  return (
    <section id="ai-office-phase1" className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {AI_OFFICE_LABEL}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            告知文や返信の下書きを自動生成し、確認してから使えます。承認待ちの提案があればここで確認できます。
          </p>
        </div>
        <a
          href={aiOfficeInboxHref}
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
