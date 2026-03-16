"use client";

import React from "react";

import { AiOfficeEmptyState } from "@/components/mypage/AiOfficeFeedback";
import { AiOfficeTaskInputFields } from "@/components/mypage/AiOfficeTaskInputFields";
import {
  AI_OFFICE_TASK_TIER_HELPER,
  getAiOfficeTaskChoiceGroups,
} from "@/components/mypage/aiOfficeTaskConfig";
import type {
  AnnouncementChannel,
  DraftTone,
  Platform,
  SupporterMessagePurpose,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import { PRODUCT_TIER_META } from "@/lib/productTiers";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

type TaskTypeCopy = {
  label: string;
  helper?: string;
};

type Props = {
  loading: boolean;
  waitingApprovalCount: number;
  platform: Platform;
  accountHandle: string;
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
  onPlatformChange: (value: Platform) => void;
  onAccountHandleChange: (value: string) => void;
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
  onAddConnection: () => void;
  onCollectMetrics: () => void;
  onOpenInbox: () => void;
  onCreateTask: () => void;
  onTranslateText: () => void;
};

export function AiOfficeCreateSection(props: Props) {
  const taskChoiceGroups = React.useMemo(
    () => getAiOfficeTaskChoiceGroups(),
    []
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-900">1. 下準備</div>
        <div className="mt-1 text-xs text-gray-500">
          先に SNS 連携と最新の指標を整えると、下書きの精度が上がります。
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_auto]">
          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={props.platform}
            onChange={(e) => props.onPlatformChange(e.target.value as Platform)}
            disabled={props.loading}
          >
            <option value="YOUTUBE">YouTube</option>
            <option value="X">X</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="TIKTOK">TikTok</option>
          </select>
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            value={props.accountHandle}
            onChange={(e) => props.onAccountHandleChange(e.target.value)}
            placeholder="@account 名"
            disabled={props.loading}
          />
          <button
            type="button"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            onClick={props.onAddConnection}
            disabled={props.loading}
          >
            SNS を連携
          </button>
        </div>
        <button
          type="button"
          className="mt-3 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-40"
          onClick={props.onCollectMetrics}
          disabled={props.loading}
        >
          最新の指標を取得
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">2. AI に作らせる内容</div>
          <div className="mt-1 text-xs text-gray-500">
            いちばん近い目的を選ぶと、AI が project と最近の指標をもとに下書きを作ります。
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
              onClick={props.onOpenInbox}
              disabled={props.loading}
            >
              承認待ちを開く
            </button>
          </AiOfficeEmptyState>
        ) : null}

        <div className="space-y-4">
          {taskChoiceGroups.map((group) => (
            <div key={group.tier} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    group.tier === "BETA"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {PRODUCT_TIER_META[group.tier].label}
                </span>
                <span className="text-xs text-gray-500">
                  {AI_OFFICE_TASK_TIER_HELPER[group.tier]}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.choices.map((choice) => {
                  const copy = getAgentTaskTypeCopy(choice.taskType);
                  const isActive = props.taskType === choice.taskType;
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
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

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
