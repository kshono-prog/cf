"use client";

import { AiOfficeStatusNotice } from "@/components/mypage/AiOfficeFeedback";
import { AiOfficeTaskInputFields } from "@/components/mypage/AiOfficeTaskInputFields";
import type {
  AiOfficeRoleChoice,
  AiOfficeRoleGuidance,
  AiOfficeTaskChoice,
} from "@/components/mypage/aiOfficeTaskConfig";
import type {
  AiOfficeRoleUsefulnessView,
  AnnouncementChannel,
  DraftTone,
  SupporterMessagePurpose,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import {
  canSkipApproval,
  isInformationalTask,
} from "@/lib/agentTaskPolicy";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

type Props = {
  loading: boolean;
  roleChoices: AiOfficeRoleChoice[];
  taskChoices: AiOfficeTaskChoice[];
  selectedRoleId: CreatorAiAgentRole;
  selectedRoleUsefulness: AiOfficeRoleUsefulnessView | null;
  roleGuidance: AiOfficeRoleGuidance;
  taskType: TaskType;
  requiresApproval: boolean;
  autoPost: boolean;
  translationInput: string;
  translationLang: TranslationLang;
  reportingWindowDays: number;
  draftTone: DraftTone;
  announcementChannel: AnnouncementChannel;
  includeMetricsSummary: boolean;
  includeSupportSummary: boolean;
  supporterMessagePurpose: SupporterMessagePurpose;
  translationResult: string;
  onTaskTypeChange: (value: TaskType) => void;
  onRequiresApprovalChange: (value: boolean) => void;
  onAutoPostChange: (value: boolean) => void;
  onRoleChange: (value: CreatorAiAgentRole) => void;
  onTranslationInputChange: (value: string) => void;
  onTranslationLangChange: (value: TranslationLang) => void;
  onReportingWindowDaysChange: (value: number) => void;
  onDraftToneChange: (value: DraftTone) => void;
  onAnnouncementChannelChange: (value: AnnouncementChannel) => void;
  onIncludeMetricsSummaryChange: (value: boolean) => void;
  onIncludeSupportSummaryChange: (value: boolean) => void;
  onSupporterMessagePurposeChange: (value: SupporterMessagePurpose) => void;
  onCreateTask: () => void;
  onOpenInboxForRole: (roleId: CreatorAiAgentRole) => void;
  onTranslateText: () => void;
};

const TASK_CHOICES_WITH_INPUT = [
  "TRANSLATE",
  "WEEKLY_REPORT",
  "ANNOUNCEMENT_DRAFT",
  "SUPPORTER_MESSAGE_DRAFT",
] as const;

const AUTO_POSTABLE_TASK_TYPES = new Set([
  "ANNOUNCEMENT_DRAFT",
  "TRANSLATE",
  "SUPPORT_STORY_DRAFT",
  "PROPOSE",
  "WEEKLY_REPORT",
  "SUPPORTER_MESSAGE_DRAFT",
]);

function getReviewToggleLabel(taskType: TaskType): string {
  if (taskType === "DISTRIBUTION_PLAN_DRAFT") {
    return "反映前に確認する";
  }

  return "結果を確認してから使う";
}

export function AiOfficeCreateSection(props: Props) {
  const hasInputFields = (TASK_CHOICES_WITH_INPUT as readonly string[]).includes(
    props.taskType
  );
  const canAutoPost = AUTO_POSTABLE_TASK_TYPES.has(props.taskType);
  const isInformational = isInformationalTask(props.taskType);
  const canSkipReview = canSkipApproval(props.taskType);

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div>
          <div className="section-label">どの担当に依頼しますか？</div>
          <p className="caption-text mt-1">
            担当を切り替えると、その役割で使いやすい task を優先して表示します。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {props.roleChoices.map((role) => (
            <button
              key={role.roleId}
              type="button"
              className={
                props.selectedRoleId === role.roleId
                  ? "action-pill-active"
                  : "action-pill"
              }
              onClick={() => props.onRoleChange(role.roleId)}
              disabled={props.loading}
            >
              {role.label}
            </button>
          ))}
        </div>
        {props.selectedRoleUsefulness ? (
          <div className="caption-text">
            {props.selectedRoleUsefulness.waitingApprovalCount > 0
              ? `承認待ち ${props.selectedRoleUsefulness.waitingApprovalCount} 件があります。`
              : "いま承認待ちはありません。"}
            {props.selectedRoleUsefulness.trackedReadyCount > 0
              ? ` 活用率 ${(props.selectedRoleUsefulness.usedRate * 100).toFixed(0)}% / 利用 ${props.selectedRoleUsefulness.usedCount} 件です。`
              : ""}
          </div>
        ) : null}
      </div>

      {props.roleGuidance.roleId && props.roleGuidance.tone !== "neutral" ? (
        <AiOfficeStatusNotice
          tone={props.roleGuidance.tone === "attention" ? "attention" : "info"}
          title={props.roleGuidance.title}
          description={props.roleGuidance.description}
        >
          {props.roleGuidance.roleId !== props.selectedRoleId ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => props.onRoleChange(props.roleGuidance.roleId!)}
              disabled={props.loading}
            >
              この担当に切り替える
            </button>
          ) : props.selectedRoleUsefulness?.waitingApprovalCount ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => props.onOpenInboxForRole(props.selectedRoleId)}
              disabled={props.loading}
            >
              この担当の Inbox を開く
            </button>
          ) : null}
        </AiOfficeStatusNotice>
      ) : null}

      {/* ── Task type grid ── */}
      <div className="card p-4">
        <div className="section-label">何を作りますか？</div>
        <p className="caption-text mt-1">
          タスクを選ぶとAIがプロジェクトの状況をもとに下書きを作ります。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {props.taskChoices.map((choice) => {
            const isActive = props.taskType === choice.taskType;
            const copy = getAgentTaskTypeCopy(choice.taskType);
            return (
              <button
                key={choice.taskType}
                type="button"
                className={`rounded-xl border p-3.5 text-left transition ${
                  isActive
                    ? "border-[var(--accent)] bg-[var(--surface-subtle)] ring-2 ring-[var(--line)]"
                    : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--surface-subtle)]"
                }`}
                onClick={() => props.onTaskTypeChange(choice.taskType)}
                disabled={props.loading}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`section-label ${isActive ? "text-[var(--accent)]" : ""}`}
                  >
                    {choice.eyebrow}
                  </span>
                  {isActive ? (
                    <span className="status-badge status-badge-ok shrink-0">選択中</span>
                  ) : choice.tier === "BETA" ? (
                    <span className="status-badge status-badge-warn shrink-0">試験中</span>
                  ) : null}
                </div>
                <div
                  className={`mt-1.5 text-sm font-semibold ${
                    isActive ? "text-[var(--accent)]" : "text-[var(--text)]"
                  }`}
                >
                  {copy.label}
                </div>
                <p className="mt-1 caption-text line-clamp-2">{choice.whenToUse}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Input fields (only when task needs them) ── */}
      {hasInputFields ? (
        <div className="card p-4 space-y-3">
          <div className="section-label">詳細設定</div>
          <AiOfficeTaskInputFields
            loading={props.loading}
            taskType={props.taskType}
            translationInput={props.translationInput}
            translationLang={props.translationLang}
            reportingWindowDays={props.reportingWindowDays}
            draftTone={props.draftTone}
            announcementChannel={props.announcementChannel}
            includeMetricsSummary={props.includeMetricsSummary}
            includeSupportSummary={props.includeSupportSummary}
            supporterMessagePurpose={props.supporterMessagePurpose}
            translationResult={props.translationResult}
            onTranslationInputChange={props.onTranslationInputChange}
            onTranslationLangChange={props.onTranslationLangChange}
            onReportingWindowDaysChange={props.onReportingWindowDaysChange}
            onDraftToneChange={props.onDraftToneChange}
            onAnnouncementChannelChange={props.onAnnouncementChannelChange}
            onIncludeMetricsSummaryChange={props.onIncludeMetricsSummaryChange}
            onIncludeSupportSummaryChange={props.onIncludeSupportSummaryChange}
            onSupporterMessagePurposeChange={props.onSupporterMessagePurposeChange}
            onTranslateText={props.onTranslateText}
          />
        </div>
      ) : null}

      {/* ── Create CTA ── */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {isInformational ? (
            <p className="caption-text text-[var(--text-subtle)]">
              分析や提案は承認不要です。作成するとすぐに内容を確認できます。
            </p>
          ) : canSkipReview ? (
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 caption-text select-none">
                <input
                  type="checkbox"
                  checked={props.requiresApproval}
                  onChange={(e) => props.onRequiresApprovalChange(e.target.checked)}
                  disabled={props.loading}
                  className="accent-slate-700"
                />
                {getReviewToggleLabel(props.taskType)}
              </label>
              {canAutoPost && (
                <label className="inline-flex cursor-pointer items-center gap-2 caption-text select-none">
                  <input
                    type="checkbox"
                    checked={props.autoPost}
                    onChange={(e) => props.onAutoPostChange(e.target.checked)}
                    disabled={props.loading}
                    className="accent-slate-700"
                  />
                  AIが直接投稿する
                </label>
              )}
            </div>
          ) : (
            <p className="caption-text text-[var(--text-subtle)]">
              この内容は確認ステップを挟んでから次に進みます。
            </p>
          )}
          <button
            type="button"
            className="btn"
            onClick={props.onCreateTask}
            disabled={props.loading}
          >
            {props.loading
              ? "AIが作成中..."
              : isInformational
              ? "AIに依頼する →"
              : props.autoPost && !props.requiresApproval
              ? "AIが直接投稿する →"
              : !props.requiresApproval
              ? "すぐに結果を作る →"
              : props.autoPost
              ? "作成・承認後に自動投稿 →"
              : "下書きを作る →"}
          </button>
        </div>
        {!isInformational && (
          <p className="caption-text">
            {props.autoPost && !props.requiresApproval
              ? "AIが下書きを作り、そのまま投稿します。投稿にはAIマークが付きます。"
              : props.autoPost
              ? "AIが下書きを作り、あなたが承認すると自動で投稿されます。投稿にはAIマークが付きます。"
              : props.requiresApproval || !canSkipReview
              ? "AIが下書きを作ります。内容を確認してから使えます。"
              : "AIが下書きを作ります。作成後すぐに内容を確認できます。"}
          </p>
        )}
      </div>
    </div>
  );
}
