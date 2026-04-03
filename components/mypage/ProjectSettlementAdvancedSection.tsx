"use client";

import React from "react";

export function ProjectSettlementAdvancedSection(props: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {props.title}
            </div>
            <div className="mt-1 text-xs leading-5 text-gray-600">
              {props.description}
            </div>
            <div className="mt-1 text-[11px] leading-5 text-gray-500">
              通常フローで足りないときだけ開く、operator 向けの補助操作です。
            </div>
          </div>
          <span className="rounded-full border border-gray-300 bg-white px-3 py-1 text-[11px] font-medium text-gray-700">
            必要時のみ
          </span>
        </div>
      </summary>
      <div className="mt-4">{props.children}</div>
    </details>
  );
}
