// components/mypage/MyPageAccordion.tsx
"use client";

import React from "react";

export type SectionKey =
  | "about"
  | "wallet"
  | "jpyc"
  | "flow"
  | "gas"
  | "project";

export type OpenSections = Record<SectionKey, boolean>;

type Props = {
  open: OpenSections;
  onToggle: (key: SectionKey) => void;
  title: string;
  sectionKey: SectionKey;
  children: React.ReactNode;
  right?: React.ReactNode; // 右上に小さな表示（例: 保存中…）
};

export function MyPageAccordion({
  open,
  onToggle,
  title,
  sectionKey,
  children,
  right,
}: Props) {
  const isOpen = open[sectionKey];

  return (
    <div className="card p-4 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => onToggle(sectionKey)}
        >
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-[11px] text-gray-500">
            {isOpen ? "閉じる" : "開く"}
          </span>
        </button>
        {right}
      </div>

      {isOpen && <div className="space-y-3">{children}</div>}
    </div>
  );
}
