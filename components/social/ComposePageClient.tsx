"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";

import type { CreatorProfile } from "@/lib/profileTypes";
import { PublicOwnerComposerCard } from "@/components/profile/PublicOwnerComposerCard";
import { usePublicViewerIdentity } from "@/components/shared/usePublicViewerIdentity";
import {
  CommunityGuideCard,
  CommunityGuideLoadingCard,
} from "@/components/social/CommunityGuideCard";
import { resolveComposeViewerLinks } from "@/lib/composeViewerLinks";

type ComposePageClientProps = {
  username: string;
  creator: CreatorProfile;
  projectIdsByCurrency: {
    JPYC: string | null;
    USDC: string | null;
  };
};

export function ComposePageClient(props: ComposePageClientProps) {
  const { address } = useAccount();
  const { viewerState } = usePublicViewerIdentity({
    pageUsername: props.username,
    pageCreatorAddress: props.creator.address ?? null,
    viewerAddress: address ?? null,
  });

  const projectOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = [];

    if (props.projectIdsByCurrency.JPYC) {
      options.push({
        id: props.projectIdsByCurrency.JPYC,
        label: "JPYC / 公開ページ",
      });
    }
    if (props.projectIdsByCurrency.USDC) {
      options.push({
        id: props.projectIdsByCurrency.USDC,
        label: "USDC / 公開ページ",
      });
    }

    return options;
  }, [props.projectIdsByCurrency]);

  const pageDisplayName = props.creator.displayName ?? props.username;
  const { viewerWorkspaceHref, ownComposeHref, ownProfileHref } = resolveComposeViewerLinks(
    {
      pageUsername: props.username,
      viewerState,
    }
  );

  const composeGuide = (() => {
    if (viewerState.mode === "loading") {
      return (
        <CommunityGuideLoadingCard
          title="投稿の準備を確認しています"
          body="接続状態と登録状況を読み込み中です。"
          centered
          maxWidthClassName="max-w-xl"
        />
      );
    }

    if (viewerState.mode === "unconnected") {
      return (
        <CommunityGuideCard
          title="投稿を始める前にウォレット接続"
          body="投稿機能は、右上のウォレットから接続したあとに使えます。接続後にユーザー登録をすると、自分のページと投稿画面を使い始められます。"
          centered
          maxWidthClassName="max-w-xl"
          actions={
            <>
              <Link href={`/${props.username}`} className="btn-secondary">
                プロフィールを見る
              </Link>
              <Link href={`/${props.username}/search`} className="btn-secondary">
                検索へ
              </Link>
            </>
          }
        />
      );
    }

    if (viewerState.mode === "unregistered") {
      return (
        <CommunityGuideCard
          title="ユーザー登録をすると投稿できます"
          body="表示名とユーザー名を登録すると、自分のページと投稿機能を使い始められます。"
          centered
          maxWidthClassName="max-w-xl"
          actions={
            <>
              <Link href={viewerWorkspaceHref} className="btn">
                ユーザー登録へ
              </Link>
              <Link href={`/${props.username}/search`} className="btn-secondary">
                検索へ
              </Link>
            </>
          }
        />
      );
    }

    if (!viewerState.hasCreator) {
      return (
        <CommunityGuideCard
          title="公開ページを整えると投稿できます"
          body="ユーザー登録は完了しています。次は公開ページを整えると、投稿と応援の受け取りを始められます。"
          centered
          maxWidthClassName="max-w-xl"
          actions={
            <>
              <Link href={viewerWorkspaceHref} className="btn">
                設定を開く
              </Link>
              <Link href={`/${props.username}/search`} className="btn-secondary">
                検索へ
              </Link>
            </>
          }
        />
      );
    }

    return (
      <CommunityGuideCard
        title={`いま見ているのは ${pageDisplayName} さんの投稿画面です`}
        body="投稿したいときは、自分の投稿画面へ移動してください。ここでは投稿の流れだけを確認できます。"
        centered
        maxWidthClassName="max-w-xl"
        actions={
          <>
            <Link href={ownComposeHref} className="btn">
              自分の投稿画面へ
            </Link>
            <Link href={ownProfileHref} className="btn-secondary">
              自分のページを見る
            </Link>
          </>
        }
      />
    );
  })();

  return (
    <div className="space-y-4">
      {viewerState.isOwner && address ? (
        <PublicOwnerComposerCard
          address={address}
          managementHref={`/${props.username}/mypage#public-page`}
          projectOptions={projectOptions}
          onCreated={() => {
            // composer card itself handles success state
          }}
        />
      ) : (
        composeGuide
      )}
    </div>
  );
}
