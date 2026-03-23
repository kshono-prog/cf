"use client";

import { AI_OFFICE_TASK_CHOICES, requiresApprovalByDefault } from "@/components/mypage/aiOfficeTaskConfig";
import { AiOfficeTaskInputFields } from "@/components/mypage/AiOfficeTaskInputFields";
import type {
  AnnouncementChannel,
  DraftTone,
  SupporterMessagePurpose,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

type Props = {
  loading: boolean;
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
  onTranslationInputChange: (value: string) => void;
  onTranslationLangChange: (value: TranslationLang) => void;
  onReportingWindowDaysChange: (value: number) => void;
  onDraftToneChange: (value: DraftTone) => void;
  onAnnouncementChannelChange: (value: AnnouncementChannel) => void;
  onIncludeMetricsSummaryChange: (value: boolean) => void;
  onIncludeSupportSummaryChange: (value: boolean) => void;
  onSupporterMessagePurposeChange: (value: SupporterMessagePurpose) => void;
  onCreateTask: () => void;
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

export function AiOfficeCreateSection(props: Props) {
  const hasInputFields = (TASK_CHOICES_WITH_INPUT as readonly string[]).includes(
    props.taskType
  );
  const canAutoPost = AUTO_POSTABLE_TASK_TYPES.has(props.taskType);
  const needsApproval = requiresApprovalByDefault(props.taskType);

  return (
    <div className="space-y-4">
      {/* ── Task type grid ── */}
      <div className="card p-4">
        <div className="section-label">何を作りますか？</div>
        <p className="caption-text mt-1">
          タスクを選ぶとAIがプロジェクトの状況をもとに下書きを作ります。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {AI_OFFICE_TASK_CHOICES.map((choice) => {
            const isActive = props.taskType === choice.taskType;
            const copy = getAgentTaskTypeCopy(choice.taskType);
            return (
              <button
                key={choice.taskType}
                type="button"
                className={`rounded-2xl border p-3.5 text-left transition ${
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
          {needsApproval ? (
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 caption-text select-none">
                <input
                  type="checkbox"
                  checked={props.requiresApproval}
                  onChange={(e) => props.onRequiresApprovalChange(e.target.checked)}
                  disabled={props.loading}
                  className="accent-slate-700"
                />
                公開前に承認する
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
              分析・提案は承認不要です。作成後すぐに受信トレイに届きます。
            </p>
          )}
          <button
            type="button"
            className="btn"
            onClick={props.onCreateTask}
            disabled={props.loading}
          >
            {props.loading
              ? "AIが分析中..."
              : !needsApproval
              ? "AIに依頼する →"
              : props.autoPost && !props.requiresApproval
              ? "AIが直接投稿する →"
              : props.autoPost
              ? "作成・承認後に自動投稿 →"
              : "下書きを作る →"}
          </button>
        </div>
        {needsApproval && (
          <p className="caption-text">
            {props.autoPost && !props.requiresApproval
              ? "AIが下書きを作り、そのまま投稿します。投稿にはAIマークが付きます。"
              : props.autoPost
              ? "AIが下書きを作り、あなたが承認すると自動で投稿されます。投稿にはAIマークが付きます。"
              : "AIが下書きを作ります。受信トレイで確認してから投稿できます。"}
          </p>
        )}
      </div>
    </div>
  );
}
