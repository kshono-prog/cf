"use client";

import React from "react";

import type { PublicReadiness } from "@/lib/mypage/publicReadiness";

type Action =
  | {
      label: string;
      href: string;
      tone?: "primary" | "secondary";
    }
  | {
      label: string;
      onClick: () => void;
      tone?: "primary" | "secondary";
    };

type Props = {
  title: string;
  description: string;
  readiness: PublicReadiness;
  actions?: Action[];
  compact?: boolean;
};

function actionClassName(tone: "primary" | "secondary"): string {
  return tone === "primary" ? "btn" : "btn-secondary";
}

export function PublicReadinessPanel(props: Props) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">{props.title}</div>
          <div className="mt-1 text-xs leading-5 text-gray-600">
            {props.description}
          </div>
        </div>
        <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
          公開準備 {props.readiness.completedCount} / {props.readiness.totalCount}
        </div>
      </div>

      <div className={`mt-4 grid gap-2 ${props.compact ? "" : "md:grid-cols-2"}`}>
        {props.readiness.items.map((item) => (
          <div
            key={item.key}
            className={`rounded-xl border px-3 py-3 ${
              item.ready
                ? "border-emerald-200 bg-emerald-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-gray-900">{item.label}</div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  item.ready
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-white text-gray-600"
                }`}
              >
                {item.ready ? "OK" : "未設定"}
              </span>
            </div>
            <div className="mt-1 text-xs leading-5 text-gray-600">
              {item.detail}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
          Next Action
        </div>
        <div className="mt-1 text-sm font-medium text-gray-900">
          {props.readiness.isReady
            ? "公開ページを支援者目線で最終確認する"
            : `${props.readiness.firstMissingLabel ?? "未設定項目"}から整える`}
        </div>
        <div className="mt-1 text-xs leading-5 text-gray-700">
          {props.readiness.isReady
            ? "必要な項目は揃っています。公開ページとイベントページの見え方を確認して仕上げます。"
            : "未設定の項目から順に埋めると、公開ページの理解しやすさと支援しやすさが上がります。"}
        </div>
      </div>

      {props.actions && props.actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {props.actions.map((action) =>
            "href" in action ? (
              <a
                key={`${action.label}-${action.href}`}
                href={action.href}
                target="_blank"
                rel="noreferrer"
                className={actionClassName(action.tone ?? "secondary")}
              >
                {action.label}
              </a>
            ) : (
              <button
                key={action.label}
                type="button"
                className={actionClassName(action.tone ?? "secondary")}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
