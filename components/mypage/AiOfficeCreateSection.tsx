"use client";

import React from "react";

import { AiOfficeEmptyState } from "@/components/mypage/AiOfficeFeedback";
import type {
  AnnouncementChannel,
  DraftTone,
  Platform,
  SupporterMessagePurpose,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";

type TaskTypeCopy = {
  label: string;
  helper?: string;
};

type TaskChoice = {
  taskType: TaskType;
  eyebrow: string;
  whenToUse: string;
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

const TASK_CHOICES: TaskChoice[] = [
  {
    taskType: "PROPOSE",
    eyebrow: "次の一手",
    whenToUse: "次に何を投稿・告知・改善するか迷っているとき",
  },
  {
    taskType: "ANALYZE",
    eyebrow: "振り返り",
    whenToUse: "最近の反応や変化を整理したいとき",
  },
  {
    taskType: "WEEKLY_REPORT",
    eyebrow: "週次共有",
    whenToUse: "今週の活動や進捗をまとめたいとき",
  },
  {
    taskType: "ANNOUNCEMENT_DRAFT",
    eyebrow: "告知",
    whenToUse: "支援者やフォロワー向けの告知文を作りたいとき",
  },
  {
    taskType: "SUPPORTER_MESSAGE_DRAFT",
    eyebrow: "支援者対応",
    whenToUse: "お礼や再案内のメッセージを作りたいとき",
  },
  {
    taskType: "TRANSLATE",
    eyebrow: "翻訳",
    whenToUse: "既存の文章を別の言語向けに言い換えたいとき",
  },
];

export function AiOfficeCreateSection(props: Props) {
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
            description="新しい下書きを増やす前に、Inbox で内容を確認しておくと運営が止まりません。"
          >
            <button
              type="button"
              className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
              onClick={props.onOpenInbox}
              disabled={props.loading}
            >
              Inbox を開く
            </button>
          </AiOfficeEmptyState>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TASK_CHOICES.map((choice) => {
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
                <div
                  className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    isActive ? "text-white/70" : "text-gray-500"
                  }`}
                >
                  {choice.eyebrow}
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

          {props.taskType === "TRANSLATE" ? (
            <>
              <textarea
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={props.translationInput}
                onChange={(e) => props.onTranslationInputChange(e.target.value)}
                placeholder="翻訳したい文章"
                disabled={props.loading}
              />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={props.translationLang}
                  onChange={(e) =>
                    props.onTranslationLangChange(
                      e.target.value as TranslationLang
                    )
                  }
                  disabled={props.loading}
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                  <option value="ko">한국어</option>
                  <option value="zh">中文</option>
                </select>
                <button
                  type="button"
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 disabled:opacity-40"
                  onClick={props.onTranslateText}
                  disabled={props.loading}
                >
                  先に翻訳を試す
                </button>
              </div>
              {props.translationResult ? (
                <pre className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
                  {props.translationResult}
                </pre>
              ) : (
                <AiOfficeEmptyState
                  compact
                  title="ここに翻訳案が表示されます"
                  description="文章を入力して「先に翻訳を試す」を押すと、結果を確認できます。"
                />
              )}
            </>
          ) : null}

          {props.taskType === "WEEKLY_REPORT" ? (
            <label className="grid gap-1 text-xs text-gray-700">
              <span>集計期間（日数）</span>
              <input
                className="rounded-xl border px-3 py-2 text-sm"
                type="number"
                min={1}
                max={31}
                value={props.reportingWindowDays}
                onChange={(e) =>
                  props.onReportingWindowDaysChange(
                    Math.max(1, Math.min(31, Number(e.target.value) || 7))
                  )
                }
                disabled={props.loading}
              />
            </label>
          ) : null}

          {props.taskType === "ANNOUNCEMENT_DRAFT" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-xs text-gray-700">
                <span>届け先</span>
                <select
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={props.announcementChannel}
                  onChange={(e) =>
                    props.onAnnouncementChannelChange(
                      e.target.value as AnnouncementChannel
                    )
                  }
                  disabled={props.loading}
                >
                  <option value="SUPPORTERS">支援者向け</option>
                  <option value="GENERAL">一般公開向け</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-gray-700">
                <span>文体</span>
                <select
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={props.draftTone}
                  onChange={(e) =>
                    props.onDraftToneChange(e.target.value as DraftTone)
                  }
                  disabled={props.loading}
                >
                  <option value="warm">あたたかめ</option>
                  <option value="formal">丁寧</option>
                  <option value="casual">カジュアル</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-gray-700">
                <span>根拠に使う期間（日数）</span>
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  type="number"
                  min={1}
                  max={31}
                  value={props.reportingWindowDays}
                  onChange={(e) =>
                    props.onReportingWindowDaysChange(
                      Math.max(1, Math.min(31, Number(e.target.value) || 7))
                    )
                  }
                  disabled={props.loading}
                />
              </label>
              <div className="flex flex-col justify-end gap-2 text-xs text-gray-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={props.includeMetricsSummary}
                    onChange={(e) =>
                      props.onIncludeMetricsSummaryChange(e.target.checked)
                    }
                    disabled={props.loading}
                  />
                  指標サマリーを含める
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={props.includeSupportSummary}
                    onChange={(e) =>
                      props.onIncludeSupportSummaryChange(e.target.checked)
                    }
                    disabled={props.loading}
                  />
                  支援状況を含める
                </label>
              </div>
            </div>
          ) : null}

          {props.taskType === "SUPPORTER_MESSAGE_DRAFT" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-xs text-gray-700">
                <span>メッセージの目的</span>
                <select
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={props.supporterMessagePurpose}
                  onChange={(e) =>
                    props.onSupporterMessagePurposeChange(
                      e.target.value as SupporterMessagePurpose
                    )
                  }
                  disabled={props.loading}
                >
                  <option value="THANK_YOU">お礼を伝える</option>
                  <option value="REENGAGEMENT">再度案内する</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-gray-700">
                <span>文体</span>
                <select
                  className="rounded-xl border px-3 py-2 text-sm"
                  value={props.draftTone}
                  onChange={(e) =>
                    props.onDraftToneChange(e.target.value as DraftTone)
                  }
                  disabled={props.loading}
                >
                  <option value="warm">あたたかめ</option>
                  <option value="formal">丁寧</option>
                  <option value="casual">カジュアル</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-gray-700">
                <span>根拠に使う期間（日数）</span>
                <input
                  className="rounded-xl border px-3 py-2 text-sm"
                  type="number"
                  min={1}
                  max={90}
                  value={props.reportingWindowDays}
                  onChange={(e) =>
                    props.onReportingWindowDaysChange(
                      Math.max(1, Math.min(90, Number(e.target.value) || 30))
                    )
                  }
                  disabled={props.loading}
                />
              </label>
              <div className="flex flex-col justify-end gap-2 text-xs text-gray-700">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={props.includeMetricsSummary}
                    onChange={(e) =>
                      props.onIncludeMetricsSummaryChange(e.target.checked)
                    }
                    disabled={props.loading}
                  />
                  指標サマリーを含める
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={props.includeSupportSummary}
                    onChange={(e) =>
                      props.onIncludeSupportSummaryChange(e.target.checked)
                    }
                    disabled={props.loading}
                  />
                  支援状況を含める
                </label>
              </div>
            </div>
          ) : null}

          {(props.taskType === "ANALYZE" || props.taskType === "PROPOSE") && (
            <AiOfficeEmptyState
              compact
              title="追加の入力は不要です"
              description="project と最近の指標をもとに、自動で内容を作成します。"
            />
          )}
        </div>
      </div>
    </div>
  );
}
