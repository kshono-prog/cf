"use client";

import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";

import { usePublicViewerIdentity } from "@/components/shared/usePublicViewerIdentity";

type AnchorTab = {
  id: string;
  label: string;
  anchor: string;
};

type Props = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  creatorWalletAddress: string | null;
  themeColor: string | null;
  supportHref: string | null;
  anchorTabs: AnchorTab[];
};

// ── アイコン ─────────────────────────────────────────────────

function IconHome() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <path
        d="M4 9.8 L10 4.8 L16 9.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 9.2 V16 H14 V9.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDiscover() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 13.5 L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <rect x="2.5" y="5.5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 8.5 L17.5 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="14" cy="12.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconCompose() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <path
        d="M10 4 V16 M4 10 H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <path
        d="M6.5 8.8 a3.5 3.5 0 1 1 7 0 v2.6 l1.3 2.1 H5.2 l1.3-2.1 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 15.5 a1.8 1.8 0 0 0 3 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <circle cx="10" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.8 16 C5.8 13.6 7.8 12.4 10 12.4 C12.2 12.4 14.2 13.6 15.2 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSupport() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <path
        d="M10 15 C8 13 3 10 3 7 C3 5 5 3.5 7 3.5 C8.2 3.5 9.2 4.2 10 5.2 C10.8 4.2 11.8 3.5 13 3.5 C15 3.5 17 5 17 7 C17 10 12 13 10 15 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAiManager() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <path
        d="M10 2.5 L11.5 7 L16.5 8.5 L11.5 10 L10 14.5 L8.5 10 L3.5 8.5 L8.5 7 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 3 L16 4.5 L17.5 5 L16 5.5 L15.5 7 L15 5.5 L13.5 5 L15 4.5 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPosts() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="13" x2="11" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSupporters() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <circle cx="8" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 17 C3 14.2 5.2 12 8 12 C10.8 12 13 14.2 13 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M13 13 C14 12.5 17 13 17 16.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCredibility() {
  return (
    <svg viewBox="0 0 20 20" className="ws-nav-icon" fill="none" aria-hidden="true">
      <path
        d="M10 2 L17 5 L17 10.5 C17 14 13.8 17 10 18 C6.2 17 3 14 3 10.5 L3 5 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M7 10 L9 12.5 L13.5 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function anchorIcon(id: string) {
  switch (id) {
    case "support":     return <IconSupport />;
    case "ai-manager":  return <IconAiManager />;
    case "posts":       return <IconPosts />;
    case "supporters":  return <IconSupporters />;
    case "credibility": return <IconCredibility />;
    default:            return <IconPosts />;
  }
}

async function openWalletConnect(): Promise<void> {
  const { appkit } = await import("@/lib/appkitInstance");
  await appkit.open({ view: "Connect" });
}

function scrollToSupport(): void {
  const el = document.getElementById("support-projects");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

type PrimaryNavKey =
  | "home"
  | "search"
  | "compose"
  | "notifications"
  | "profile"
  | "discover"
  | "support"
  | "wallet";

type PrimaryNavItem =
  | { kind: "link"; key: PrimaryNavKey; label: string; href: string; active?: boolean }
  | { kind: "button"; key: PrimaryNavKey; label: string; onClick: () => void };

function primaryNavIcon(key: PrimaryNavKey) {
  switch (key) {
    case "home":
      return <IconHome />;
    case "search":
    case "discover":
      return <IconDiscover />;
    case "compose":
      return <IconCompose />;
    case "notifications":
      return <IconBell />;
    case "profile":
      return <IconProfile />;
    case "support":
      return <IconSupport />;
    case "wallet":
      return <IconWallet />;
  }
}

// ── コンポーネント ───────────────────────────────────────────

export function PublicProfilePageSidebar({
  username,
  displayName,
  avatarUrl,
  creatorWalletAddress,
  themeColor,
  supportHref,
  anchorTabs,
}: Props) {
  const { address, isConnected } = useAccount();
  const { viewerState } = usePublicViewerIdentity({
    pageUsername: username,
    pageCreatorAddress: creatorWalletAddress,
    viewerAddress: address ?? null,
    isConnected,
  });
  const initials = displayName.trim().slice(0, 1).toUpperCase() || "?";
  const logoStyle = themeColor ? { background: themeColor } : undefined;
  const btnStyle = themeColor
    ? { backgroundColor: themeColor, boxShadow: `0 2px 8px ${themeColor}55` }
    : undefined;
  const primaryItems: PrimaryNavItem[] = viewerState.isOwner
    ? [
        { kind: "link", key: "home", label: "ホーム", href: `/${username}/home` },
        { kind: "link", key: "search", label: "検索", href: `/${username}/search` },
        { kind: "link", key: "compose", label: "投稿", href: `/${username}/compose` },
        {
          kind: "link",
          key: "notifications",
          label: "通知",
          href: `/${username}/notifications`,
        },
        { kind: "link", key: "profile", label: "プロフィール", href: `/${username}`, active: true },
      ]
    : viewerState.isConnected
    ? [
        { kind: "link", key: "discover", label: "発見", href: "/creators" },
        { kind: "button", key: "support", label: "応援へ", onClick: scrollToSupport },
        { kind: "button", key: "wallet", label: "ウォレット", onClick: () => void openWalletConnect() },
      ]
    : [
        { kind: "link", key: "discover", label: "発見", href: "/creators" },
        {
          kind: "button",
          key: "wallet",
          label: "ウォレット接続",
          onClick: () => void openWalletConnect(),
        },
      ];

  return (
    <div className="flex flex-col h-full py-3 px-2 gap-1">

      {/* ロゴ */}
      <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
        <div className="ws-logo-mark" style={logoStyle}>
          {initials}
        </div>
        <span className="ws-logo-text">{displayName}</span>
      </div>

      {/* サイトナビ — ボトムメニューと同等の項目 */}
      <nav className="flex flex-col gap-0.5">
        {primaryItems.map((item) =>
          item.kind === "link" ? (
            <Link
              key={item.key}
              href={item.href}
              className={`ws-nav-item${item.active ? " active" : ""}`}
              aria-current={item.active ? "page" : undefined}
            >
              {primaryNavIcon(item.key)}
              <span className="ws-nav-label">{item.label}</span>
            </Link>
          ) : (
            <button
              key={item.key}
              type="button"
              className="ws-nav-item"
              onClick={item.onClick}
            >
              {primaryNavIcon(item.key)}
              <span className="ws-nav-label">{item.label}</span>
            </button>
          )
        )}
      </nav>

      {/* 区切り */}
      <div className="my-1 mx-3 border-t border-[var(--line)]" />

      {/* ページ内アンカーナビ */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {anchorTabs.map((tab) => (
          <a
            key={tab.id}
            href={tab.anchor}
            className="ws-nav-item"
          >
            {anchorIcon(tab.id)}
            <span className="ws-nav-label">{tab.label}</span>
          </a>
        ))}
      </nav>

      {/* 応援ボタン */}
      {supportHref ? (
        <Link href={supportHref} className="ws-post-btn mt-2" style={btnStyle}>
          <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M10 15 C8 13 3 10 3 7 C3 5 5 3.5 7 3.5 C8.2 3.5 9.2 4.2 10 5.2 C10.8 4.2 11.8 3.5 13 3.5 C15 3.5 17 5 17 7 C17 10 12 13 10 15 Z" />
          </svg>
          <span className="ws-post-label">応援する</span>
        </Link>
      ) : null}

      {/* フッタープロフィール */}
      <div className="flex items-center justify-center lg:justify-start gap-2.5 px-2 py-2 rounded-full hover:bg-[var(--surface-subtle)] transition-colors cursor-default mt-1">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${displayName} のアイコン`}
            width={34}
            height={34}
            quality={95}
            sizes="34px"
            className="rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-[34px] h-[34px] rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {initials}
          </div>
        )}
        <div className="hidden lg:flex flex-col min-w-0">
          <span className="block text-sm font-bold truncate leading-tight text-[var(--text)]">
            {displayName}
          </span>
          <span className="block text-xs text-[var(--text-subtle)] truncate leading-tight">
            @{username}
          </span>
        </div>
      </div>
    </div>
  );
}
