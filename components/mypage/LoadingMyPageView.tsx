"use client";

import React from "react";

import { MyPageShell } from "@/components/mypage/MyPageShell";

type Props = {
  headerColor: string;
};

export function LoadingMyPageView({ headerColor }: Props) {
  return (
    <MyPageShell headerColor={headerColor}>
      <div className="container-narrow">
        <p className="text-sm text-gray-500">読み込み中です…</p>
      </div>
    </MyPageShell>
  );
}
