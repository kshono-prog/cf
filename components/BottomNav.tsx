"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { fetchMeResponseCached } from "@/lib/publicViewerIdentityClient";
import { parsePublicViewerMeResponse } from "@/lib/publicViewerState";

export type BottomNavProps = {
  username?: string;
  themeColor?: string | null;
  creatorWalletAddress?: string | null;
};

// ── Icons ──────────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path
        d="M4.5 11.5 12 5l7.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 10.7v7.3h10v-7.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <circle
        cx="10.5"
        cy="10.5"
        r="5.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m15.2 15.2 4.3 4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCompose() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path
        d="M7.5 10.5a4.5 4.5 0 1 1 9 0v3.2l1.5 2.3H6l1.5-2.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.5a2.3 2.3 0 0 0 4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <circle
        cx="12"
        cy="8.5"
        r="3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5.5 18c1.3-2.7 3.6-4.1 6.5-4.1 2.9 0 5.2 1.4 6.5 4.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** コイン+プラス — 「応援を送る」をより直感的に表す */
function IconSupport({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <circle
        cx="10"
        cy="12"
        r="5.8"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M10 8.9v6.2M6.9 12h6.2"
        fill="none"
        stroke={filled ? "white" : "currentColor"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16.4 8.4h3.2M18 6.8v3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <rect
        x="3"
        y="6"
        width="18"
        height="13"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3 10h18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="17" cy="14.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path
        d="M15 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Helper ─────────────────────────────────────────────────────────────────

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

// ── Nav item types ─────────────────────────────────────────────────────────

type NavItemKey =
  | "home"
  | "search"
  | "compose"
  | "notifications"
  | "profile"
  | "discover"
  | "support"
  | "wallet"
  | "back"
  | "self";

type NavItem =
  | { kind: "link"; key: NavItemKey; label: string; href: string; highlight?: boolean }
  | { kind: "button"; key: NavItemKey; label: string; highlight?: boolean; onClick: () => void };

function iconFor(key: NavItemKey, highlight?: boolean) {
  switch (key) {
    case "home":
      return <IconHome />;
    case "search":
    case "discover":
      return <IconSearch />;
    case "compose":
      return <IconCompose />;
    case "notifications":
      return <IconBell />;
    case "profile":
    case "self":
      return <IconProfile />;
    case "support":
      return <IconSupport filled={highlight} />;
    case "wallet":
      return <IconWallet />;
    case "back":
      return <IconBack />;
  }
}

// ── Shared item renderers ───────────────────────────────────────────────────

function HighlightItem({
  item,
  themeColor,
}: {
  item: NavItem;
  themeColor?: string | null;
}) {
  const accentColor = themeColor ?? "#7c3aed";
  const icon = iconFor(item.key, true);

  const inner = (
    <span
      className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition active:scale-95"
      style={{ backgroundColor: accentColor }}
      aria-label={item.label}
    >
      {icon}
    </span>
  );

  if (item.kind === "button") {
    return (
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center justify-center py-1 md:px-1"
        onClick={item.onClick}
        aria-label={item.label}
      >
        <span className="flex items-center gap-2 md:rounded-full md:px-2.5 md:py-1.5">
          {inner}
          <span className="hidden text-xs font-semibold text-[var(--text)] md:inline">
            {item.label}
          </span>
        </span>
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className="flex min-w-0 flex-1 items-center justify-center py-1 md:px-1"
      aria-label={item.label}
    >
      <span className="flex items-center gap-2 md:rounded-full md:px-2.5 md:py-1.5">
        {inner}
        <span className="hidden text-xs font-semibold text-[var(--text)] md:inline">
          {item.label}
        </span>
      </span>
    </Link>
  );
}

function RegularItem({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const icon = iconFor(item.key);
  const className = `flex min-w-0 flex-1 items-center justify-center rounded-xl p-2.5 transition ${
    isActive
      ? "text-[var(--text)]"
      : "text-[var(--text-subtle)] hover:text-[var(--text)]"
  } md:min-w-[5.5rem] md:flex-none md:rounded-full md:px-3 md:py-2`;
  const content = (
    <span className="flex items-center gap-2">
      {icon}
      <span className="hidden text-xs font-medium md:inline">{item.label}</span>
    </span>
  );

  if (item.kind === "button") {
    return (
      <button
        type="button"
        className={className}
        onClick={item.onClick}
        aria-label={item.label}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      aria-label={item.label}
    >
      {content}
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function BottomNav({
  username,
  themeColor,
  creatorWalletAddress,
}: BottomNavProps) {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const [viewerOwnerUsername, setViewerOwnerUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address || !username || creatorWalletAddress) {
      if (!isConnected || !address) {
        setViewerOwnerUsername(null);
      }
      return;
    }

    let cancelled = false;
    const connectedAddress = address;

    async function loadViewerIdentity() {
      try {
        const response = await fetchMeResponseCached(connectedAddress);
        const identity = parsePublicViewerMeResponse(response);
        const nextUsername =
          identity?.creatorUsername ?? identity?.user?.username ?? null;

        if (!cancelled) {
          setViewerOwnerUsername(nextUsername);
        }
      } catch {
        if (!cancelled) {
          setViewerOwnerUsername(null);
        }
      }
    }

    void loadViewerIdentity();

    return () => {
      cancelled = true;
    };
  }, [address, creatorWalletAddress, isConnected, username]);

  const isOwnerByAddress =
    isConnected &&
    !!address &&
    !!creatorWalletAddress &&
    !!username &&
    address.toLowerCase() === creatorWalletAddress.toLowerCase();
  const isOwnerByUsername =
    isConnected &&
    !!username &&
    !!viewerOwnerUsername &&
    viewerOwnerUsername.toLowerCase() === username.toLowerCase();
  const isOwner = isOwnerByAddress || isOwnerByUsername;

  if (pathname?.includes("/mypage")) {
    return null;
  }

  let items: NavItem[];

  if (isOwner && username) {
    items = [
      { kind: "link", key: "home", label: "ホーム", href: `/${username}/home` },
      { kind: "link", key: "search", label: "検索", href: `/${username}/search` },
      { kind: "link", key: "compose", label: "投稿", href: `/${username}/compose` },
      { kind: "link", key: "notifications", label: "通知", href: `/${username}/notifications` },
      { kind: "link", key: "profile", label: "プロフィール", href: `/${username}` },
    ];
  } else if (isConnected) {
    if (username) {
      // Connected non-owner: on a creator profile page
      items = [
        { kind: "link", key: "discover", label: "発見", href: "/creators" },
        {
          kind: "button",
          key: "support",
          label: "応援へ",
          highlight: true,
          onClick: scrollToSupport,   // already connected → scroll to support card
        },
        {
          kind: "button",
          key: "wallet",
          label: "ウォレット",
          onClick: () => void openWalletConnect(),
        },
      ];
    } else {
      // Connected, /creators page — no creator context
      items = [
        { kind: "link", key: "discover", label: "発見", href: "/creators" },
        {
          kind: "button",
          key: "wallet",
          label: "ウォレット",
          onClick: () => void openWalletConnect(),
        },
      ];
    }
  } else {
    // Unconnected
    if (username) {
      // Unconnected visitor on a creator profile page
      items = [
        { kind: "link", key: "discover", label: "発見", href: "/creators" },
        {
          kind: "button",
          key: "wallet",
          label: "ウォレット接続",
          onClick: () => void openWalletConnect(),
        },
      ];
    } else {
      // Unconnected, /creators page
      items = [
        { kind: "link", key: "discover", label: "発見", href: "/creators" },
        {
          kind: "button",
          key: "wallet",
          label: "ウォレット接続",
          onClick: () => void openWalletConnect(),
        },
      ];
    }
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:left-1/2 md:bottom-5 md:w-auto md:-translate-x-1/2 md:rounded-full md:border md:bg-[color-mix(in_srgb,var(--surface)_92%,var(--surface-subtle)_8%)] md:pb-0 md:shadow-[0_14px_32px_rgba(15,23,42,0.12)] md:backdrop-blur"
      style={themeColor ? { borderTopColor: themeColor } : undefined}
    >
      <div className="mx-auto flex max-w-[760px] items-center gap-0 px-2 md:max-w-none md:gap-1.5 md:px-2 md:py-2">
        {items.map((item) => {
          const isActive =
            item.kind === "link" &&
            (pathname === item.href || (item.key === "profile" && pathname === `/${username}`));

          if (item.highlight) {
            return (
              <HighlightItem
                key={item.key}
                item={item}
                themeColor={themeColor}
              />
            );
          }

          return (
            <RegularItem
              key={item.key}
              item={item}
              isActive={isActive}
            />
          );
        })}
      </div>
    </nav>
  );
}
