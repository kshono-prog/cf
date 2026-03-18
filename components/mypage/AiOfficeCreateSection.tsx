"use client";

import React from "react";

import {
  AiOfficeEmptyState,
  AiOfficeStatusNotice,
} from "@/components/mypage/AiOfficeFeedback";
import { AiOfficeTaskInputFields } from "@/components/mypage/AiOfficeTaskInputFields";
import {
  getAiOfficeRoleGuidance,
  getAiOfficeRoleChoices,
  getAiOfficeRoleUsefulness,
  getAiOfficeTaskRoleChoices,
  getAiOfficeTaskUsefulness,
  sortAiOfficeTaskChoicesByUsefulness,
} from "@/components/mypage/aiOfficeTaskConfig";
import type {
  AiOfficeContentSummaryView,
  AiOfficeUsefulnessSummaryView,
  AgentTaskView,
  AnnouncementChannel,
  DraftTone,
  SupporterMessagePurpose,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import { PRODUCT_TIER_META } from "@/lib/productTiers";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

type TaskTypeCopy = {
  label: string;
  helper?: string;
};

type Props = {
  loading: boolean;
  waitingApprovalCount: number;
  contentSummary: AiOfficeContentSummaryView;
  usefulness: AiOfficeUsefulnessSummaryView;
  tasks: AgentTaskView[];
  selectedRoleId: CreatorAiAgentRole;
  taskType: TaskType;
  taskTypeCopy: TaskTypeCopy;
  requiresApproval: boolean;
  translationInput: string;
  translationLang: TranslationLang;
  reportingWindowDays: number;
  draftTone: DraftTone;
  announcementChannel: AnnouncementChannel;
  includeMetricsSummary: boolean;
  includeSupportSummary: boolean;
  supporterMessagePurpose: SupporterMessagePurpose;
  translationResult: string;
  onRoleChange: (value: CreatorAiAgentRole) => void;
  onTaskTypeChange: (value: TaskType) => void;
  onRequiresApprovalChange: (value: boolean) => void;
  onTranslationInputChange: (value: string) => void;
  onTranslationLangChange: (value: TranslationLang) => void;
  onReportingWindowDaysChange: (value: number) => void;
  onDraftToneChange: (value: DraftTone) => void;
  onAnnouncementChannelChange: (value: AnnouncementChannel) => void;
  onIncludeMetricsSummaryChange: (value: boolean) => void;
  onIncludeSupportSummaryChange: (value: boolean) => void;
  onSupporterMessagePurposeChange: (value: SupporterMessagePurpose) => void;
  onCollectMetrics: () => void;
  onOpenInbox: (roleId?: CreatorAiAgentRole) => void;
  onCreateTask: () => void;
  onTranslateText: () => void;
};

export function AiOfficeCreateSection(props: Props) {
  const roleChoices = React.useMemo(() => getAiOfficeRoleChoices(), []);
  const selectedRole =
    roleChoices.find((role) => role.roleId === props.selectedRoleId) ??
    roleChoices[0] ??
    null;
  const selectedTaskRoles = React.useMemo(
    () => getAiOfficeTaskRoleChoices(props.taskType),
    [props.taskType]
  );
  const roleGuidance = React.useMemo(
    () => getAiOfficeRoleGuidance(roleChoices, props.usefulness.roleBreakdown),
    [props.usefulness.roleBreakdown, roleChoices]
  );
  const sortedTaskChoices = React.useMemo(
    () =>
      selectedRole
        ? sortAiOfficeTaskChoicesByUsefulness(selectedRole.taskChoices, props.tasks)
        : [],
    [props.tasks, selectedRole]
  );
  const selectedRoleUsefulness = React.useMemo(
    () =>
      selectedRole
        ? getAiOfficeRoleUsefulness(
            selectedRole.roleId,
            props.usefulness.roleBreakdown
          )
        : undefined,
    [props.usefulness.roleBreakdown, selectedRole]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-900">1. 下準備</div>
        <div className="mt-1 text-xs text-gray-500">
          外部SNS連携ではなく、Creator Founding 内の投稿と反応を土台に下書きを作ります。
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-[11px] text-gray-500">公開中の投稿</div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              {props.contentSummary.publishedPosts}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-[11px] text-gray-500">下書き</div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              {props.contentSummary.draftPosts}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-[11px] text-gray-500">AI生成の投稿</div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              {props.contentSummary.aiGeneratedPosts}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-40"
            onClick={props.onCollectMetrics}
            disabled={props.loading}
          >
            Creator Founding の投稿指標を更新
          </button>
          <div className="text-xs leading-5 text-gray-500">
            投稿がまだない場合でも `MANAGER_NEXT_ACTIONS` と配分 draft は使えます。告知系の下書き精度は、投稿後に上がります。
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">2. 役割から選ぶ</div>
          <div className="mt-1 text-xs text-gray-500">
            `Manager / Promotion / Finance / Fan Relation` の役割から近いものを選ぶと、AI が project と Creator Founding 内の投稿指標をもとに下書きを作ります。
          </div>
        </div>

        {props.waitingApprovalCount > 0 ? (
          <AiOfficeEmptyState
            title={`先に確認したい承認待ちが ${props.waitingApprovalCount} 件あります`}
            description="新しい下書きを増やす前に、承認待ちで内容を確認しておくと運営が止まりません。"
          >
            <button
              type="button"
              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
              onClick={() => props.onOpenInbox()}
              disabled={props.loading}
            >
              承認待ちを開く
            </button>
          </AiOfficeEmptyState>
        ) : null}

        <div
          className={`rounded-2xl border px-4 py-3 ${
            roleGuidance.tone === "attention"
              ? "border-amber-200 bg-amber-50"
              : roleGuidance.tone === "recommended"
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-slate-50"
          }`}
        >
          <div
            className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
              roleGuidance.tone === "attention"
                ? "text-amber-700"
                : roleGuidance.tone === "recommended"
                  ? "text-emerald-700"
                  : "text-slate-600"
            }`}
          >
            role guidance
          </div>
          <div
            className={`mt-1 text-sm font-semibold ${
              roleGuidance.tone === "attention"
                ? "text-amber-950"
                : roleGuidance.tone === "recommended"
                  ? "text-emerald-950"
                  : "text-slate-900"
            }`}
          >
            {roleGuidance.title}
          </div>
          <div
            className={`mt-1 text-xs leading-5 ${
              roleGuidance.tone === "attention"
                ? "text-amber-800"
                : roleGuidance.tone === "recommended"
                  ? "text-emerald-800"
                  : "text-slate-700"
            }`}
          >
            {roleGuidance.description}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {roleGuidance.tone === "attention" ? (
              <button
                type="button"
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 disabled:opacity-40"
                onClick={() =>
                  roleGuidance.roleId
                    ? props.onOpenInbox(roleGuidance.roleId)
                    : props.onOpenInbox()
                }
                disabled={props.loading}
              >
                承認待ちを開く
              </button>
            ) : roleGuidance.roleId ? (
              <button
                type="button"
                className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
                onClick={() => {
                  if (roleGuidance.roleId) {
                    props.onRoleChange(roleGuidance.roleId);
                  }
                }}
                disabled={props.loading}
              >
                この role を選ぶ
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {roleChoices.map((role) => {
            const isActive = selectedRole?.roleId === role.roleId;
            const roleUsefulness = getAiOfficeRoleUsefulness(
              role.roleId,
              props.usefulness.roleBreakdown
            );

            return (
              <button
                key={role.roleId}
                type="button"
                className={`rounded-2xl border p-4 text-left transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-gray-200 bg-white text-gray-900 hover:border-slate-400"
                }`}
                onClick={() => props.onRoleChange(role.roleId)}
                disabled={props.loading}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{role.label}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      isActive
                        ? "bg-white/15 text-white"
                        : role.tier === "BETA"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {PRODUCT_TIER_META[role.tier].label}
                  </span>
                </div>
                <div
                  className={`mt-2 text-xs leading-5 ${
                    isActive ? "text-white/80" : "text-gray-600"
                  }`}
                >
                  {role.roleHelper}
                </div>
                <div
                  className={`mt-2 text-[11px] ${
                    isActive ? "text-white/70" : "text-gray-500"
                  }`}
                >
                  {roleUsefulness
                    ? roleUsefulness.waitingApprovalCount > 0
                      ? `承認待ち ${roleUsefulness.waitingApprovalCount} 件 / 保留が長い ${roleUsefulness.ignoredCount} 件`
                      : `対応率 ${(roleUsefulness.followThroughRate * 100).toFixed(
                          0
                        )}% / 承認 ${roleUsefulness.approvedCount} 件`
                    : `${role.executionBoundary === "advisory_only" ? "提案中心" : "承認前提"} / task ${role.taskChoices.length}件`}
                </div>
              </button>
            );
          })}
        </div>

        {selectedRole ? (
          <div className="space-y-3 rounded-2xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  3. {selectedRole.label} に任せる内容
                </div>
                <div className="mt-1 text-xs leading-5 text-gray-500">
                  {selectedRole.roleHelper}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    selectedRole.tier === "BETA"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {PRODUCT_TIER_META[selectedRole.tier].label}
                </span>
                <span className="text-xs text-gray-500">
                  {selectedRole.executionBoundary === "advisory_only"
                    ? "提案と整理が中心"
                    : "下書きは必ず承認前提"}
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectedRoleUsefulness &&
              selectedRoleUsefulness.waitingApprovalCount > 0 ? (
                <div className="xl:col-span-3">
                  <AiOfficeStatusNotice
                    tone={
                      selectedRoleUsefulness.ignoredCount > 0
                        ? "attention"
                        : "info"
                    }
                    title={
                      selectedRoleUsefulness.ignoredCount > 0
                        ? `${selectedRole.label} に保留が長い承認待ちがあります`
                        : `${selectedRole.label} に承認待ちがあります`
                    }
                    description={
                      selectedRoleUsefulness.ignoredCount > 0
                        ? `承認待ち ${selectedRoleUsefulness.waitingApprovalCount} 件のうち ${selectedRoleUsefulness.ignoredCount} 件は長く止まっています。先に確認してから新しい下書きへ進めます。`
                        : `この role では承認待ちが ${selectedRoleUsefulness.waitingApprovalCount} 件あります。内容確認を先に済ませると、新しい下書きが重なりにくくなります。`
                    }
                  >
                    <button
                      type="button"
                      className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
                      onClick={() => props.onOpenInbox(selectedRole.roleId)}
                      disabled={props.loading}
                    >
                      この role の承認待ちを見る
                    </button>
                  </AiOfficeStatusNotice>
                </div>
              ) : null}
              {sortedTaskChoices.map((choice) => {
                  const copy = getAgentTaskTypeCopy(choice.taskType);
                  const isActive = props.taskType === choice.taskType;
                  const taskUsefulness = getAiOfficeTaskUsefulness(
                    choice.taskType,
                    props.tasks
                  );
                  return (
                    <button
                      key={choice.taskType}
                      type="button"
                      className={`rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-gray-200 bg-white text-gray-900 hover:border-slate-400"
                      }`}
                      onClick={() => props.onTaskTypeChange(choice.taskType)}
                      disabled={props.loading}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            isActive ? "text-white/70" : "text-gray-500"
                          }`}
                        >
                          {choice.eyebrow}
                        </div>
                        {choice.tier === "BETA" ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isActive
                                ? "bg-white/15 text-white"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            Beta
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm font-semibold">{copy.label}</div>
                      <div
                        className={`mt-2 text-xs leading-5 ${
                          isActive ? "text-white/80" : "text-gray-600"
                        }`}
                      >
                        {choice.whenToUse}
                      </div>
                      <div
                        className={`mt-2 text-[11px] ${
                          isActive ? "text-white/70" : "text-gray-500"
                        }`}
                      >
                        {taskUsefulness.waitingApprovalCount > 0
                          ? `承認待ち ${taskUsefulness.waitingApprovalCount} 件`
                          : taskUsefulness.actionableCount > 0
                            ? `対応率 ${(taskUsefulness.followThroughRate * 100).toFixed(
                                0
                              )}% / 承認 ${taskUsefulness.approvedCount} 件`
                            : taskUsefulness.autoCompletedCount > 0
                              ? `自動完了 ${taskUsefulness.autoCompletedCount} 件`
                              : "まだ履歴はありません"}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={props.requiresApproval}
              onChange={(e) => props.onRequiresApprovalChange(e.target.checked)}
              disabled={props.loading}
            />
            公開前に承認する
          </label>
          <button
            type="button"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            onClick={props.onCreateTask}
            disabled={props.loading}
          >
            この内容で作成
          </button>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4">
          <div className="text-xs text-gray-500">選択中</div>
          {selectedTaskRoles.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTaskRoles.map((role) => (
                <span
                  key={role.roleId}
                  className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700"
                >
                  {role.label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-1 text-sm font-semibold text-gray-900">
            {props.taskTypeCopy.label}
          </div>
          {props.taskTypeCopy.helper ? (
            <div className="mt-2 text-xs leading-5 text-gray-600">
              {props.taskTypeCopy.helper}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="text-xs text-gray-500">入力</div>
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
            onSupporterMessagePurposeChange={
              props.onSupporterMessagePurposeChange
            }
            onTranslateText={props.onTranslateText}
          />
        </div>
      </div>
    </div>
  );
}
