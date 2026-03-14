"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import type { CreatorProfile } from "@/lib/profileTypes";
import { PublicOwnerComposerCard } from "@/components/profile/PublicOwnerComposerCard";
import {
  parsePublicViewerMeResponse,
  resolvePublicViewerState,
} from "@/lib/publicViewerState";

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
        const response = await fetch(
          `/api/me?address=${encodeURIComponent(connectedAddress)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        const json: unknown = await response.json().catch(() => null);
        if (!cancelled) {
          setViewerIdentity(
            response.ok ? parsePublicViewerMeResponse(json) : null
          );
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
  const compactGuideClass = "surface-subtle px-4 py-4 sm:px-5";
  const compactGuideTitleClass = "text-sm font-semibold text-[var(--text)]";
  const compactGuideBodyClass = "mt-1 text-xs leading-6 text-[var(--text-subtle)]";

  const composeGuide = (() => {
    if (viewerState.mode === "loading") {
      return (
        <section className={compactGuideClass}>
          <div className="mx-auto max-w-xl text-center">
            <h2 className={compactGuideTitleClass}>
              投稿の準備を確認しています
            </h2>
            <p className={compactGuideBodyClass}>
              接続状態と登録状況を読み込み中です。
            </p>
          </div>
        </section>
      );
    }

    if (viewerState.mode === "unconnected") {
      return (
        <section className={compactGuideClass}>
          <div className="mx-auto max-w-xl text-center">
            <h2 className={compactGuideTitleClass}>
              投稿を始めるには、まずウォレット接続
            </h2>
            <p className={compactGuideBodyClass}>
              このアプリでは、ウォレット接続のあとにユーザー登録をすると、自分のページを作って投稿できるようになります。
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn" onClick={() => void handleConnect()}>
                ウォレット接続
              </button>
              <Link href={onboardingHref} className="btn-secondary">
                使い方を見る
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (viewerState.mode === "unregistered") {
      return (
        <section className={compactGuideClass}>
          <div className="mx-auto max-w-xl text-center">
            <h2 className={compactGuideTitleClass}>
              ユーザー登録をすると投稿できます
            </h2>
            <p className={compactGuideBodyClass}>
              表示名とユーザー名を登録すると、自分のページと投稿機能を使い始められます。
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link href={onboardingHref} className="btn">
                ユーザー登録へ
              </Link>
              <Link href={`/${props.username}`} className="btn-secondary">
                プロフィールを見る
              </Link>
            </div>
          </div>
        </section>
      );
    }

    if (!viewerState.hasCreator) {
      return (
        <section className={compactGuideClass}>
          <div className="mx-auto max-w-xl text-center">
            <h2 className={compactGuideTitleClass}>
              公開ページを整えると投稿できます
            </h2>
            <p className={compactGuideBodyClass}>
              ユーザー登録は完了しています。次は公開ページを整えると、投稿と応援の受け取りを始められます。
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link href={onboardingHref} className="btn">
                設定を開く
              </Link>
              <Link href={`/${props.username}`} className="btn-secondary">
                プロフィールを見る
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className={compactGuideClass}>
        <div className="mx-auto max-w-xl text-center">
          <h2 className={compactGuideTitleClass}>
            いま見ているのは {pageDisplayName} さんの投稿画面です
          </h2>
          <p className={compactGuideBodyClass}>
            投稿したいときは、自分の投稿画面へ移動してください。ここでは投稿の流れだけを確認できます。
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link href={ownComposeHref} className="btn">
              自分の投稿画面へ
            </Link>
            <Link href={ownProfileHref} className="btn-secondary">
              自分のページを見る
            </Link>
          </div>
        </div>
      </section>
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
