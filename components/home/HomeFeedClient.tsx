"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";

import { LazyFeedSection } from "@/components/feed/LazyFeedSection";
import { usePublicViewerIdentity } from "@/components/shared/usePublicViewerIdentity";
import {
  CommunityGuideCard,
  CommunityGuideLoadingCard,
} from "@/components/social/CommunityGuideCard";
import type { FeedListView } from "@/lib/feedList";
import type { CreatorProfile } from "@/lib/profileTypes";

const PublicOwnerComposerCard = dynamic(
  () =>
    import("@/components/profile/PublicOwnerComposerCard").then(
      (module) => module.PublicOwnerComposerCard
    ),
  {
    loading: () => (
      <CommunityGuideLoadingCard
        title="投稿フォームを準備しています"
        body="投稿の入口を読み込み中です。"
      />
    ),
  }
);

type CreatorProfileInput = Omit<CreatorProfile, "address"> & {
  address?: string | null;
};

type Props = {
  username: string;
  creator: CreatorProfileInput;
  projectId: string | null;
  projectIdsByCurrency?: {
    JPYC: string | null;
    USDC: string | null;
  } | null;
  initialFeed?: FeedListView | null;
  layout?: "full" | "content";
};

export function HomeFeedClient({
  username,
  creator: creatorInput,
  projectId,
  projectIdsByCurrency,
  initialFeed = null,
  layout = "full",
}: Props) {
  const { address: viewerAddress } = useAccount();
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [feedRefreshToken, setFeedRefreshToken] = useState(0);

  const creator = useMemo(() => {
    const normalizedAddress =
      typeof creatorInput.address === "string" && creatorInput.address.length > 0
        ? creatorInput.address
        : undefined;

    return {
      ...(creatorInput as Omit<CreatorProfile, "address">),
      address: normalizedAddress,
    };
  }, [creatorInput]);

  const resolvedProjectIdsByCurrency = useMemo(
    () => ({
      JPYC: projectIdsByCurrency?.JPYC ?? projectId ?? null,
      USDC: projectIdsByCurrency?.USDC ?? null,
    }),
    [projectId, projectIdsByCurrency]
  );

  const { viewerState } = usePublicViewerIdentity({
    pageUsername: username,
    pageCreatorAddress: creator.address ?? null,
    viewerAddress: viewerAddress ?? null,
  });

  const ownerProjectOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = [];
    const seen = new Set<string>();
    const defaultLabelBase =
      creator.displayName?.trim() || `${username} の公開ページ`;

    for (const currency of ["JPYC", "USDC"] as const) {
      const nextId = resolvedProjectIdsByCurrency[currency];
      if (!nextId || seen.has(nextId)) continue;
      seen.add(nextId);
      options.push({
        id: nextId,
        label: `${currency} / ${defaultLabelBase}`,
      });
    }

    return options;
  }, [
    creator.displayName,
    resolvedProjectIdsByCurrency,
    username,
  ]);

  const ownerComposerManagementHref = `/${username}/mypage#public-page`;
  const viewerWorkspaceHref = viewerState.userUsername
    ? `/${viewerState.userUsername}/mypage`
    : `/${username}/mypage`;
  const viewerComposeHref = viewerState.creatorUsername
    ? `/${viewerState.creatorUsername}/compose`
    : viewerWorkspaceHref;

  async function handleViewerConnect(): Promise<void> {
    const { appkit } = await import("@/lib/appkitInstance");
    await appkit.open({ view: "Connect" });
  }

  function handleOwnerPostCreated() {
    setFeedRefreshToken((current) => current + 1);
    window.requestAnimationFrame(() => {
      timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const homeGuideCard = (() => {
    if (viewerState.mode === "loading") {
      return (
        <CommunityGuideLoadingCard
          title="準備を確認しています"
          body="接続状態と登録状況を読み込み中です。"
        />
      );
    }

    if (viewerState.mode === "unconnected") {
      return null;
    }

    if (viewerState.mode === "unregistered") {
      return (
        <CommunityGuideCard
          title="応援はそのままできます。投稿したいときはユーザー登録"
          body="まずは登録すると、自分のページと投稿機能を使い始められます。"
          actions={
            <>
              <Link href={`/${username}`} className="btn">
                プロフィールを見る
              </Link>
              <Link href={viewerWorkspaceHref} className="btn-secondary">
                ユーザー登録へ
              </Link>
            </>
          }
        />
      );
    }

    if (!viewerState.hasCreator) {
      return (
        <CommunityGuideCard
          title="公開ページを整えると、投稿や通知の準備が進みます"
          body="ホームの流れを見ながら、自分の公開ページも整えると、投稿や応援の受け取りを始めやすくなります。"
          actions={
            <Link href={viewerWorkspaceHref} className="btn-secondary">
              設定を開く
            </Link>
          }
        />
      );
    }

    return (
      <CommunityGuideCard
        title="いま見ているのは、みんなの最新投稿です"
        body="気になる投稿に反応しながら流れを見られます。投稿したいときは自分のページへ移動できます。"
        actions={
          <Link href={viewerComposeHref} className="btn-secondary">
            自分の投稿画面へ
          </Link>
        }
      />
    );
  })();

  const content = (
    <div className="space-y-4">
      {viewerState.isOwner && viewerAddress ? (
        <PublicOwnerComposerCard
          address={viewerAddress as Address}
          managementHref={ownerComposerManagementHref}
          projectOptions={ownerProjectOptions}
          onCreated={handleOwnerPostCreated}
        />
      ) : (
        homeGuideCard
      )}

      <div id="timeline" ref={timelineRef}>
        <LazyFeedSection
          creatorUsername={null}
          viewerAddress={viewerAddress ?? null}
          managedCreatorUsername={viewerState.creatorUsername}
          managePostAddress={viewerState.hasCreator ? viewerAddress ?? null : null}
          manageProjectOptions={ownerProjectOptions}
          selectedPostId={null}
          projectIdsByCurrency={{ JPYC: null, USDC: null }}
          showTipAction={false}
          refreshToken={feedRefreshToken}
          initialFeed={initialFeed}
          headerColor={creator.themeColor || "#2563eb"}
          onSelectTipPost={() => {
            // Home timeline keeps support on each profile, not inline.
          }}
          onFocusWalletSection={() => void handleViewerConnect()}
        />
      </div>
    </div>
  );

  if (layout === "content") {
    return content;
  }

  return <div className="space-y-4">{content}</div>;
}
