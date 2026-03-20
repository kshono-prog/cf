"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import type { CreatorProfile } from "@/lib/profileTypes";
import { PublicOwnerComposerCard } from "@/components/profile/PublicOwnerComposerCard";
import {
  CommunityGuideCard,
  CommunityGuideLoadingCard,
} from "@/components/social/CommunityGuideCard";
import {
  parsePublicViewerMeResponse,
  resolvePublicViewerState,
} from "@/lib/publicViewerState";
import { fetchPublicViewerIdentityCached } from "@/lib/publicViewerIdentityClient";

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
  const [viewerIdentityResolved, setViewerIdentityResolved] = useState(false);
  const [viewerIdentity, setViewerIdentity] = useState<ReturnType<
    typeof parsePublicViewerMeResponse
  > | null>(null);

  useEffect(() => {
    if (!address) {
      setViewerIdentity(null);
      setViewerIdentityResolved(true);
      return;
    }

    const connectedAddress = address;
    let cancelled = false;

    async function loadViewer() {
      setViewerIdentityResolved(false);
      try {
        const identity = await fetchPublicViewerIdentityCached(connectedAddress);
        if (!cancelled) {
          setViewerIdentity(identity);
        }
      } catch {
        if (!cancelled) {
          setViewerIdentity(null);
        }
      } finally {
        if (!cancelled) {
          setViewerIdentityResolved(true);
        }
      }
    }

    void loadViewer();

    return () => {
      cancelled = true;
    };
  }, [address]);

  const viewerState = resolvePublicViewerState({
    pageUsername: props.username,
    pageCreatorAddress: props.creator.address ?? null,
    viewerAddress: address ?? null,
    identity: viewerIdentity,
    identityResolved: viewerIdentityResolved,
  });

  async function handleConnect(): Promise<void> {
    const { appkit } = await import("@/lib/appkitInstance");
    await appkit.open({ view: "Connect" });
  }

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
  const onboardingHref = `/${props.username}/mypage`;
  const ownComposeHref = viewerState.creatorUsername
    ? `/${viewerState.creatorUsername}/compose`
    : onboardingHref;
  const ownProfileHref = viewerState.creatorUsername
    ? `/${viewerState.creatorUsername}`
    : onboardingHref;

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
          title="投稿を始めるには、まずウォレット接続"
          body="このアプリでは、ウォレット接続のあとにユーザー登録をすると、自分のページを作って投稿できるようになります。"
          centered
          maxWidthClassName="max-w-xl"
          actions={
            <>
              <button type="button" className="btn" onClick={() => void handleConnect()}>
                ウォレット接続
              </button>
              <Link href={onboardingHref} className="btn-secondary">
                使い方を見る
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
              <Link href={onboardingHref} className="btn">
                ユーザー登録へ
              </Link>
              <Link href={`/${props.username}`} className="btn-secondary">
                プロフィールを見る
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
              <Link href={onboardingHref} className="btn">
                設定を開く
              </Link>
              <Link href={`/${props.username}`} className="btn-secondary">
                プロフィールを見る
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
