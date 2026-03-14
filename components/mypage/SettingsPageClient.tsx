"use client";

import type { Address } from "viem";

import { CreatorAdvancedSettingsSection } from "@/components/mypage/CreatorAdvancedSettingsSection";
import { CreatorProfileSection } from "@/components/mypage/CreatorProfileSection";
import { CurrencyProjectManagementBlock } from "@/components/mypage/CurrencyProjectManagementBlock";
import { WalletOverviewCard } from "@/components/mypage/WalletOverviewCard";
import { useCreatorReadyProjectDashboards } from "@/components/mypage/useCreatorReadyProjectDashboards";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import { formatAmountByCurrency } from "@/lib/mypage/accountPageTypes";
import type { CreatorProfile, SocialLinks, YoutubeVideo } from "@/types/creator";
import type {
  OpenSections,
  SectionKey,
} from "@/components/mypage/MyPageAccordion";

type SettingsPageClientProps = {
  initialWorkspaceView: "home" | "support-page" | "supporters" | "public" | "advanced";
  workspaceBasePath: string;
  meCreatorUsername: string;
  eventBaseUrl: string;
  themeColor: string;
  error: string | null;
  localProjectId: string | null;
  address: Address | undefined;
  isConnected: boolean;
  editingProfile: boolean;
  onStartEditProfile: () => void;
  onCancelEditProfile: () => void;
  displayName: string;
  profile: string;
  avatarUrl: string;
  externalUrl: string;
  themeColorValue: string;
  creatorType: CreatorProfile["creatorType"];
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
  avatarFile: File | null;
  avatarPreview: string | null;
  setDisplayName: React.Dispatch<React.SetStateAction<string>>;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  setExternalUrl: React.Dispatch<React.SetStateAction<string>>;
  setThemeColor: React.Dispatch<React.SetStateAction<string>>;
  setCreatorType: React.Dispatch<React.SetStateAction<CreatorProfile["creatorType"]>>;
  setSocials: React.Dispatch<React.SetStateAction<SocialLinks>>;
  setYoutubeVideos: React.Dispatch<React.SetStateAction<YoutubeVideo[]>>;
  setAvatarFile: React.Dispatch<React.SetStateAction<File | null>>;
  setAvatarPreview: React.Dispatch<React.SetStateAction<string | null>>;
  saving: boolean;
  onSubmitProfile: (e: React.FormEvent) => void;
  projectIdsByCurrency: { JPYC: string | null; USDC: string | null };
  onActiveProjectIdChange: (pid: string | null, changedCur: CurrencyCode) => void;
  openSections: OpenSections;
  onToggleSection: (key: SectionKey) => void;
};

export function SettingsPageClient(props: SettingsPageClientProps) {
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyProjectDashboards({
      view: "home",
      address: props.address,
      isConnected: props.isConnected,
      projectIdsByCurrency: props.projectIdsByCurrency,
    });

  const primarySummary =
    projectDashboardsByCurrency.JPYC?.summary ??
    projectDashboardsByCurrency.USDC?.summary ??
    null;

  const supportHeadline =
    (primarySummary?.project.title ?? props.displayName) ||
    props.meCreatorUsername;
  const supportTarget =
    primarySummary?.goal
      ? formatAmountByCurrency(
          primarySummary.goal.targetAmount ??
            primarySummary.goal.targetAmountJpyc,
          primarySummary.goal.unitCurrency ?? "JPYC"
        )
      : "未設定";
  const supportProgress =
    primarySummary?.progress != null
      ? `${Math.floor(primarySummary.progress.progressPct)}%`
      : "未設定";

  return (
    <div className="space-y-4">
      <section id="settings-root" className="surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              設定
            </h1>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              公開ページの見え方、応援の見せ方、ウォレット状態を整えるための画面です。
            </p>
          </div>
          <button type="button" className="btn" onClick={props.onStartEditProfile}>
            公開ページを整える
          </button>
        </div>
        {props.error ? <div className="alert-warn mt-4">{props.error}</div> : null}
        {dashboardError ? <div className="alert-warn mt-4">{dashboardError}</div> : null}
        <div className="mt-4 surface-subtle px-4 py-4">
          <div className="text-sm font-semibold text-[var(--text)]">
            いまは公開ページまで準備できています
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            次は、見に来た人に何を伝えたいか、どんな応援を受け付けたいかを整えていく段階です。
          </p>
        </div>
      </section>

      <section id="basic-info" className="surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">基本情報</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              まずは、あなたがどんな人か分かる最小情報を整えます。
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={props.onStartEditProfile}
          >
            編集する
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[auto,1fr]">
          {props.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.avatarUrl}
              alt={`${props.displayName} のアイコン`}
              className="h-16 w-16 rounded-full border border-[var(--line)] object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] text-lg font-semibold text-[var(--text-subtle)]">
              {(props.displayName || props.meCreatorUsername).slice(0, 1)}
            </div>
          )}
          <div className="space-y-2">
            <div className="text-lg font-semibold text-[var(--text)]">
              {props.displayName || "未設定"}
            </div>
            <div className="text-sm text-[var(--text-subtle)]">
              @{props.meCreatorUsername}
            </div>
            <p className="text-sm leading-7 text-[var(--text)]">
              {props.profile || "紹介文はまだ設定されていません。"}
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs text-[var(--text-subtle)]">
              <span
                className="inline-block h-3 w-3 rounded-full border border-[var(--line)]"
                style={{ backgroundColor: props.themeColorValue || "#f0f1f4" }}
              />
              背景トーン
            </div>
          </div>
        </div>
      </section>

      <section id="public-page" className="surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">公開ページ</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              見に来た人が、何を応援できるのかを迷わず理解できるように整えます。
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={props.onStartEditProfile}
          >
            公開ページを整える
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="surface-subtle px-4 py-4">
            <div className="text-sm text-[var(--text-subtle)]">いま集めていること</div>
            <div className="mt-2 text-base font-semibold text-[var(--text)]">
              {supportHeadline}
            </div>
          </div>
          <div className="surface-subtle px-4 py-4">
            <div className="text-sm text-[var(--text-subtle)]">目標金額</div>
            <div className="mt-2 text-base font-semibold text-[var(--text)]">
              {supportTarget}
            </div>
          </div>
          <div className="surface-subtle px-4 py-4">
            <div className="text-sm text-[var(--text-subtle)]">進捗</div>
            <div className="mt-2 text-base font-semibold text-[var(--text)]">
              {supportProgress}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="surface-subtle px-4 py-4">
            <div className="text-sm text-[var(--text-subtle)]">外部リンク</div>
            <div className="mt-2 break-all text-sm text-[var(--text)]">
              {props.externalUrl || "未設定"}
            </div>
          </div>
          <div className="surface-subtle px-4 py-4">
            <div className="text-sm text-[var(--text-subtle)]">公開ページの素材</div>
            <div className="mt-2 text-sm text-[var(--text)]">
              SNSリンク {Object.values(props.socials).filter(Boolean).length} 件 / 紹介動画{" "}
              {props.youtubeVideos.filter((video) => video.url.trim()).length} 件
            </div>
          </div>
        </div>
      </section>

      <div id="wallet-section">
        <WalletOverviewCard
          address={props.address}
          isConnected={props.isConnected}
        />
      </div>

      {props.editingProfile ? (
        <CreatorProfileSection
          username={props.meCreatorUsername}
          editing={props.editingProfile}
          onStartEdit={props.onStartEditProfile}
          onCancelEdit={props.onCancelEditProfile}
          displayName={props.displayName}
          profile={props.profile}
          externalUrl={props.externalUrl}
          avatarUrl={props.avatarUrl}
          themeColor={props.themeColorValue}
          creatorType={props.creatorType}
          socials={props.socials}
          youtubeVideos={props.youtubeVideos}
          avatarFile={props.avatarFile}
          avatarPreview={props.avatarPreview}
          setDisplayName={props.setDisplayName}
          setProfile={props.setProfile}
          setExternalUrl={props.setExternalUrl}
          setThemeColor={props.setThemeColor}
          setCreatorType={props.setCreatorType}
          setSocials={props.setSocials}
          setYoutubeVideos={props.setYoutubeVideos}
          setAvatarFile={props.setAvatarFile}
          setAvatarPreview={props.setAvatarPreview}
          saving={props.saving}
          onSubmit={props.onSubmitProfile}
          baseUrl={props.eventBaseUrl}
        />
      ) : null}

      <details
        id="advanced-settings"
        className="surface-card px-5 py-4 sm:px-6"
        open={false}
      >
        <summary className="cursor-pointer list-none text-lg font-semibold text-[var(--text)]">
          詳細な設定を開く
        </summary>
        <p className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
          Project 作成、Goal 保存、Summary、Bridge、Distribution、txHash 管理などの高度機能はここにまとめています。
        </p>
        <div className="mt-4 space-y-4">
          <div className="space-y-4">
            {(["JPYC", "USDC"] as const).map((currency) => (
              <CurrencyProjectManagementBlock
                key={currency}
                currency={currency}
                ownerAddress={props.address?.toLowerCase() ?? ""}
                activeProjectId={props.projectIdsByCurrency[currency]}
                initialDashboard={projectDashboardsByCurrency[currency]}
                walletAddress={props.address ?? null}
                isConnected={props.isConnected}
                onActiveProjectIdChange={props.onActiveProjectIdChange}
              />
            ))}
          </div>

          <CreatorAdvancedSettingsSection
            projectIdsByCurrency={props.projectIdsByCurrency}
            projectDashboardsByCurrency={projectDashboardsByCurrency}
            walletAddress={props.address?.toLowerCase() ?? null}
            isConnected={props.isConnected}
          />
        </div>
      </details>
    </div>
  );
}
