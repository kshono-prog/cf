"use client";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

type Props = {
  error: string | null;
  dashboardError: string | null;
};

export function CreatorSettingsHeaderSection(props: Props) {
  const workspace = useCreatorReadyWorkspace();

  return (
    <section id="settings-root" className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            プロフィール設定
          </h1>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            公開ページに表示されるプロフィール情報や応援設定を管理します。
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={workspace.onStartEditProfile}
        >
          プロフィールを編集する
        </button>
      </div>
      {props.error ? <div className="alert-warn mt-4">{props.error}</div> : null}
      {props.dashboardError ? (
        <div className="alert-warn mt-4">{props.dashboardError}</div>
      ) : null}
    </section>
  );
}
