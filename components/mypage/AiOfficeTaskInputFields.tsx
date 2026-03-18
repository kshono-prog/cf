"use client";

import React from "react";

import { AiOfficeEmptyState } from "@/components/mypage/AiOfficeFeedback";
import type {
  AnnouncementChannel,
  DraftTone,
  SupporterMessagePurpose,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";

type Props = {
  loading: boolean;
  taskType: TaskType;
  translationInput: string;
  translationLang: TranslationLang;
  reportingWindowDays: number;
  draftTone: DraftTone;
  announcementChannel: AnnouncementChannel;
  includeMetricsSummary: boolean;
  includeSupportSummary: boolean;
  supporterMessagePurpose: SupporterMessagePurpose;
  translationResult: string;
  onTranslationInputChange: (value: string) => void;
  onTranslationLangChange: (value: TranslationLang) => void;
  onReportingWindowDaysChange: (value: number) => void;
  onDraftToneChange: (value: DraftTone) => void;
  onAnnouncementChannelChange: (value: AnnouncementChannel) => void;
  onIncludeMetricsSummaryChange: (value: boolean) => void;
  onIncludeSupportSummaryChange: (value: boolean) => void;
  onSupporterMessagePurposeChange: (value: SupporterMessagePurpose) => void;
  onTranslateText: () => void;
};

function clampToRange(
  rawValue: string,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

export function AiOfficeTaskInputFields(props: Props) {
  if (props.taskType === "TRANSLATE") {
    return (
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
              props.onTranslationLangChange(e.target.value as TranslationLang)
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
    );
  }

  if (props.taskType === "WEEKLY_REPORT") {
    return (
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
              clampToRange(e.target.value, 7, 1, 31)
            )
          }
          disabled={props.loading}
        />
      </label>
    );
  }

  if (props.taskType === "ANNOUNCEMENT_DRAFT") {
    return (
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
            onChange={(e) => props.onDraftToneChange(e.target.value as DraftTone)}
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
                clampToRange(e.target.value, 7, 1, 31)
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
    );
  }

  if (props.taskType === "SUPPORTER_MESSAGE_DRAFT") {
    return (
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
            onChange={(e) => props.onDraftToneChange(e.target.value as DraftTone)}
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
                clampToRange(e.target.value, 30, 1, 90)
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
    );
  }

  return (
    <AiOfficeEmptyState
      compact
      title="追加の入力は不要です"
      description="project / summary / settlement 状態をもとに、自動で内容を作成します。"
    />
  );
}
