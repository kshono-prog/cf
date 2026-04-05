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
    <div className="accent-surface-amber rounded-xl px-4 py-4">
      <div className="mb-1 text-sm font-semibold text-[var(--text)]">
        未返礼の応援があります
      </div>
      <div className="mb-3 text-xs accent-text-amber">
        直近 30 日間に {thankNeededCount} 件の支援があります。お礼メッセージを送りましょう。
      </div>
      <div className="flex flex-wrap gap-2">
        {!prepared ? (
          <button
            type="button"
            onClick={handlePrepareThank}
            className="btn"
          >
            お礼文を下書き
          </button>
        ) : (
          <>
            <div className="flex items-center gap-1 text-xs accent-text-amber">
              <span>✓</span>
              <span>下書きを準備しました</span>
            </div>
            <Link href={composeHref} className="btn-secondary">
              投稿に進む →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
