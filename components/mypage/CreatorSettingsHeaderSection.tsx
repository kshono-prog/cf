"use client";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { mapWorkspaceActionError } from "@/lib/mypage/workspaceActionCopy";

type Props = {
  error: string | null;
  dashboardError: string | null;
};

export function CreatorSettingsHeaderSection(props: Props) {
  const errorNotice = props.error
    ? mapWorkspaceActionError(props.error, props.error)
    : null;
  const dashboardErrorNotice = props.dashboardError
    ? mapWorkspaceActionError(
        props.dashboardError,
        "運営データの取得に失敗しました。"
      )
    : null;

  return (
    <section id="settings-root" className="surface-card p-5 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
          公開までのセットアップ
        </h1>
        <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
          公開ページを整え、SNSで広げて、最初の支援につなげるまでの準備をここでまとめます。
        </p>
      </div>
      {errorNotice ? (
        <div className="mt-4">
          <WorkspaceStatusNotice
            tone={errorNotice.tone}
            title={errorNotice.title}
            description={errorNotice.description}
          />
        </div>
      ) : null}
      {dashboardErrorNotice ? (
        <div className="mt-4">
          <WorkspaceStatusNotice
            tone={dashboardErrorNotice.tone}
            title={dashboardErrorNotice.title}
            description={dashboardErrorNotice.description}
          />
        </div>
      ) : null}
    </section>
  );
}
