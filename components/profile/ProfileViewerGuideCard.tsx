"use client";

import Link from "next/link";

import type { PublicViewerState } from "@/lib/publicViewerState";

type Props = {
  viewerState: PublicViewerState;
  canOpenSupportSheet: boolean;
  pageDisplayName: string;
  ownerPageReviewed: boolean;
  ownerShareDraftHref: string;
  viewerComposeHref: string;
  viewerWorkspaceHref: string;
  viewerProfileHref: string;
  onConfirmOwnerPageReviewed: () => void;
  onOpenSupportSheet: () => void;
};

export function ProfileViewerGuideCard({
  viewerState,
  canOpenSupportSheet,
  pageDisplayName,
  ownerPageReviewed,
  ownerShareDraftHref,
  viewerComposeHref,
  viewerWorkspaceHref,
  viewerProfileHref,
  onConfirmOwnerPageReviewed,
  onOpenSupportSheet,
}: Props) {
  if (viewerState.isOwner) {
    return (
      <section className="panel-card px-4 py-3.5 sm:px-5 sm:py-3.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[15px] font-semibold text-[var(--text)]">
              これはあなたの公開ページです
            </div>
            <p className="mt-0.5 text-[12px] leading-5 text-[var(--text-subtle)]">
              見え方を確認しながら、拡散文面づくりや進捗共有にすぐ進めます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={ownerPageReviewed ? "btn-secondary" : "btn-secondary"}
              onClick={onConfirmOwnerPageReviewed}
            >
              {ownerPageReviewed
                ? "確認済みとして反映済み"
                : "この公開ページを確認しました"}
            </button>
            <Link href={ownerShareDraftHref} className="btn-secondary">
              拡散文面を作る
            </Link>
            <Link href={viewerComposeHref} className="btn">
              今の進捗をシェアする
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (viewerState.mode === "unconnected") {
    return null;
  }

  if (viewerState.mode === "unregistered") {
    return (
      <section className="panel-card px-4 py-3.5 sm:px-5 sm:py-3.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[15px] font-semibold text-[var(--text)]">
              {canOpenSupportSheet
                ? "応援はできます。投稿したいときはユーザー登録"
                : "投稿したいときはユーザー登録"}
            </div>
            <p className="mt-0.5 text-[12px] leading-5 text-[var(--text-subtle)]">
              {canOpenSupportSheet
                ? "まずは登録すると、自分のページと投稿機能を使い始められます。"
                : "まずは登録すると、自分のページと投稿機能を使い始められます。応援内容は公開ページの準備が整うと表示されます。"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canOpenSupportSheet ? (
              <button type="button" className="btn" onClick={onOpenSupportSheet}>
                応援する
              </button>
            ) : null}
            <Link href={viewerWorkspaceHref} className="btn-secondary">
              ユーザー登録へ
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!viewerState.hasCreator) {
    return (
      <section className="panel-card px-4 py-3.5 sm:px-5 sm:py-3.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[15px] font-semibold text-[var(--text)]">
              {canOpenSupportSheet
                ? "自分の公開ページを作ると、投稿も始められます"
                : "自分の公開ページを整えると、応援内容も表示できます"}
            </div>
            <p className="mt-0.5 text-[12px] leading-5 text-[var(--text-subtle)]">
              {canOpenSupportSheet
                ? `いまは ${pageDisplayName} さんのページを見ています。自分のページを整えると投稿も始められます。`
                : `いまは ${pageDisplayName} さんのページを見ています。自分のページを整えると、応援内容も自然に見せられます。`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canOpenSupportSheet ? (
              <button type="button" className="btn" onClick={onOpenSupportSheet}>
                応援する
              </button>
            ) : null}
            <Link href={viewerWorkspaceHref} className="btn-secondary">
              設定を開く
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[20px] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-2.5 sm:px-5 sm:py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-medium text-[var(--text-subtle)]">
          いま見ているのは {pageDisplayName} さんの公開ページです
        </div>
        <Link href={viewerProfileHref} className="btn-secondary px-3 py-1.5 text-[12px]">
          自分のページを見る
        </Link>
      </div>
    </section>
  );
}
