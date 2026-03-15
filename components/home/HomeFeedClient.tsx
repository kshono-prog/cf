"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";

import { LazyFeedSection } from "@/components/feed/LazyFeedSection";
import type { FeedListView } from "@/lib/feedList";
import type { CreatorProfile } from "@/lib/profileTypes";
import { fetchPublicViewerIdentityCached } from "@/lib/publicViewerIdentityClient";
import {
  parsePublicViewerMeResponse,
  resolvePublicViewerState,
} from "@/lib/publicViewerState";

const PublicOwnerComposerCard = dynamic(
  () =>
    import("@/components/profile/PublicOwnerComposerCard").then(
      (module) => module.PublicOwnerComposerCard
    ),
  {
    loading: () => (
      <section className="surface-subtle px-4 py-4 text-sm text-[var(--text-subtle)] sm:px-5">
        投稿フォームを準備しています…
      </section>
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
  const [viewerIdentityResolved, setViewerIdentityResolved] = useState(false);
  const [viewerIdentity, setViewerIdentity] = useState<ReturnType<
    typeof parsePublicViewerMeResponse
  > | null>(null);
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

  useEffect(() => {
    if (!viewerAddress) {
      setViewerIdentity(null);
      setViewerIdentityResolved(true);
      return;
    }

    const connectedAddress = viewerAddress;
    let cancelled = false;

    async function fetchViewerIdentity(): Promise<void> {
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

    void fetchViewerIdentity();

    return () => {
      cancelled = true;
    };
  }, [viewerAddress]);

  const viewerState = resolvePublicViewerState({
    pageUsername: username,
    pageCreatorAddress: creator.address ?? null,
    viewerAddress: viewerAddress ?? null,
    identity: viewerIdentity,
    identityResolved: viewerIdentityResolved,
  });

  const ownerProjectOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = [];
    const seen = new Set<string>();
    const defaultLabelBase =
      creator.goalTitle?.trim() || `${creator.displayName || username} の公開ページ`;

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
    creator.goalTitle,
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
        <section className="surface-subtle px-4 py-4 sm:px-5">
          <div className="text-sm font-semibold text-[var(--text)]">
            準備を確認しています
          </div>
          <p className="mt-1 text-xs leading-6 text-[var(--text-subtle)]">
            接続状態と登録状況を読み込み中です。
          </p>
        </section>
      );
    }

    if (viewerState.mode === "unconnected") {
      return null;
    }

    if (viewerState.mode === "unregistered") {
      return (
        <section className="surface-subtle px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[var(--text)]">
                応援はそのままできます。投稿したいときはユーザー登録
              </div>
              <p className="mt-1 text-xs leading-6 text-[var(--text-subtle)]">
                まずは登録すると、自分のページと投稿機能を使い始められます。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/${username}`} className="btn">
                プロフィールを見る
              </Link>
              <Link href={viewerWorkspaceHref} className="btn-secondary">
                ユーザー登録へ
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (!viewerState.hasCreator) {
      return null;
    }

    return (
      <section className="surface-subtle px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              いま見ているのは、みんなの最新投稿です
            </div>
            <p className="mt-1 text-xs leading-6 text-[var(--text-subtle)]">
              気になる投稿に反応しながら流れを見られます。投稿したいときは自分のページへ移動できます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={viewerComposeHref} className="btn-secondary">
              自分の投稿画面へ
            </Link>
          </div>
        </div>
      </section>
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
