"use client";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import type { ProjectDashboardsByCurrency } from "@/lib/mypage/dashboardTypes";
import { formatAmountByCurrency } from "@/lib/mypage/accountPageTypes";

type Props = {
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
};

export function CreatorSettingsSupportSection(props: Props) {
  const workspace = useCreatorReadyWorkspace();
  const primarySummary =
    props.projectDashboardsByCurrency.JPYC?.summary ??
    props.projectDashboardsByCurrency.USDC?.summary ??
    null;
  const supportHeadline =
    (primarySummary?.project.title ?? workspace.displayName) ||
    workspace.meCreatorUsername;
  const supportTarget =
    primarySummary?.goal
      ? formatAmountByCurrency(
          primarySummary.goal.targetAmount,
          primarySummary.goal.unitCurrency ?? "JPYC"
        )
      : "未設定";
  const supportProgress =
    primarySummary?.progress != null
      ? `${Math.floor(primarySummary.progress.progressPct)}%`
      : "未設定";
  const linkedSocialCount = Object.values(workspace.socials).filter(Boolean).length;
  const linkedYoutubeCount = workspace.youtubeVideos.filter(
    (video) => video.url.trim().length > 0
  ).length;

  return (
    <section id="public-page" className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">応援の設定</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            支援者に何を伝えたいか、目標金額や外部リンクを設定できます。
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={workspace.onStartEditProfile}
        >
          設定を編集する
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="surface-subtle px-4 py-4">
          <div className="text-sm text-[var(--text-subtle)]">いま集めていること</div>
          <div className="mt-2 text-base font-semibold text-[var(--text)]">
            {supportHeadline}
          </div>
        </div>
        <div className="surface-subtle px-4 py-4">
          <div className="text-sm text-[var(--text-subtle)]">目標金額</div>
          <div className="mt-2 text-base font-semibold text-[var(--text)]">
            {supportTarget}
          </div>
        </div>
        <div className="surface-subtle px-4 py-4">
          <div className="text-sm text-[var(--text-subtle)]">進捗</div>
          <div className="mt-2 text-base font-semibold text-[var(--text)]">
            {supportProgress}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="surface-subtle px-4 py-4">
          <div className="text-sm text-[var(--text-subtle)]">外部リンク</div>
          <div className="mt-2 break-all text-sm text-[var(--text)]">
            {workspace.externalUrl || "未設定"}
          </div>
        </div>
        <div className="surface-subtle px-4 py-4">
          <div className="text-sm text-[var(--text-subtle)]">リンク・動画</div>
          <div className="mt-2 text-sm text-[var(--text)]">
            SNSリンク {linkedSocialCount} 件 ／ 紹介動画 {linkedYoutubeCount} 件
          </div>
        </div>
      </div>
    </section>
  );
}
