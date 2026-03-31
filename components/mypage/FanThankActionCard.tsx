"use client";

import React from "react";
import Link from "next/link";

import {
  POSTING_COMPOSE_HANDOFF_STORAGE_KEY,
  buildProposePostingComposeHandoff,
} from "@/components/mypage/postingComposeHandoff";

type Props = {
  thankNeededCount: number;
  projectId: string | null;
  workspaceBasePath: string;
};

function buildComposeHref(workspaceBasePath: string): string {
  // workspaceBasePath is e.g. "/alice/mypage" — point to the posting compose section
  const base = workspaceBasePath.replace(/\/mypage.*$/, "/mypage");
  return `${base}#posting-compose`;
}

export function FanThankActionCard({ thankNeededCount, projectId, workspaceBasePath }: Props) {
  const [prepared, setPrepared] = React.useState(false);

  if (thankNeededCount === 0) return null;

  function handlePrepareThank() {
    const handoff = buildProposePostingComposeHandoff({
      projectId,
      proposalText:
        "いつも応援ありがとうございます！\n\n皆さんのサポートのおかげで活動を続けられています。\nこれからも精一杯取り組みますので、引き続きよろしくお願いします！",
    });
    try {
      localStorage.setItem(POSTING_COMPOSE_HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
    } catch {
      // Ignore storage write failure
    }
    setPrepared(true);
  }

  const composeHref = buildComposeHref(workspaceBasePath);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm">
      <div className="mb-1 text-sm font-semibold text-amber-900">
        未返礼の応援があります
      </div>
      <div className="mb-3 text-xs text-amber-700">
        直近 30 日間に {thankNeededCount} 件の支援があります。お礼メッセージを送りましょう。
      </div>
      <div className="flex flex-wrap gap-2">
        {!prepared ? (
          <button
            type="button"
            onClick={handlePrepareThank}
            className="rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            お礼文を下書き
          </button>
        ) : (
          <>
            <div className="flex items-center gap-1 text-xs text-amber-800">
              <span>✓</span>
              <span>下書きを準備しました</span>
            </div>
            <Link
              href={composeHref}
              className="rounded-full border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
            >
              投稿に進む →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
