"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";

import { Avatar } from "@/components/shared/Avatar";
import {
  getAvatarInitials,
  parseHeaderViewerState,
  type HeaderViewerState,
} from "@/components/layout/headerShared";
import { fetchMeResponseCached } from "@/lib/publicViewerIdentityClient";

function MenuCaret(props: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition ${props.open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

type HeaderUserMenuProps = {
  menuPlacement?: "bottom-end" | "top-start";
  triggerVariant?: "default" | "sidebar";
};

function resolveMenuPanelClass(
  menuPlacement: "bottom-end" | "top-start",
  triggerVariant: "default" | "sidebar"
): string {
  if (menuPlacement === "top-start") {
    return triggerVariant === "sidebar"
      ? "menu-panel absolute bottom-[calc(100%+10px)] left-0 right-0 z-[60] p-3"
      : "menu-panel absolute bottom-[calc(100%+12px)] left-0 z-[60] w-[min(92vw,320px)] p-3";
  }

  return "menu-panel absolute right-0 top-[calc(100%+12px)] z-[60] w-[min(92vw,320px)] p-3";
}

function resolveRootClass(triggerVariant: "default" | "sidebar"): string {
  return triggerVariant === "sidebar" ? "relative w-full" : "relative";
}

function resolveTriggerClass(triggerVariant: "default" | "sidebar"): string {
  return triggerVariant === "sidebar"
    ? "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2 text-[var(--text)] transition hover:bg-[var(--surface)]"
    : "menu-trigger px-2";
}

export function HeaderUserMenu({
  menuPlacement = "bottom-end",
  triggerVariant = "default",
}: HeaderUserMenuProps) {
  const { address, isConnected } = useAccount();
  const pathname = usePathname();
  const pageUsername = pathname.split("/")[1] ?? null;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [viewer, setViewer] = useState<HeaderViewerState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!address || !isConnected) {
      setViewer(null);
      return;
    }

    const connectedAddress = address;
    let cancelled = false;

    async function loadViewer() {
      setLoading(true);
      try {
        const identity = await fetchMeResponseCached(connectedAddress);
        if (!cancelled) {
          setViewer(parseHeaderViewerState(identity));
        }
      } catch {
        if (!cancelled) {
          setViewer(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadViewer();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  const displayName =
    viewer?.creator?.displayName ??
    viewer?.user?.displayName ??
    (address ? shortAddress(address) : "自分");
  const viewerUsername = viewer?.creator?.username ?? viewer?.user?.username ?? null;
  const avatarUrl = viewer?.creator?.avatarUrl ?? null;
  const publicSettingsHref = viewerUsername
    ? `/${viewerUsername}/mypage#public-page`
    : null;
  const settingsHref = viewerUsername ? `/${viewerUsername}/mypage` : null;
  const hasCreator = viewer?.hasCreator === true && viewer?.creator !== null;
  const hasUser = viewer?.hasUser === true && viewer?.user !== null;
  const selfPageHref =
    viewerUsername && hasCreator ? `/${viewerUsername}` : settingsHref;

  if (!isConnected) {
    return null;
  }

  return (
    <div ref={rootRef} className={resolveRootClass(triggerVariant)}>
      <button
        type="button"
        className={resolveTriggerClass(triggerVariant)}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="自分のメニュー"
      >
        {triggerVariant === "sidebar" ? (
          <span className="flex min-w-0 items-center gap-3 text-left">
            <span className="avatar-circle overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface)]">
              <Avatar
                src={avatarUrl}
                alt={`${displayName} のアイコン`}
                fallbackText={getAvatarInitials(displayName)}
                size={36}
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--text)]">
                {loading ? "アカウント" : displayName}
              </span>
              <span className="block truncate text-xs text-[var(--text-subtle)]">
                {loading
                  ? "情報を確認中"
                  : viewerUsername
                  ? `@${viewerUsername}`
                  : address
                  ? shortAddress(address)
                  : "設定を開く"}
              </span>
            </span>
          </span>
        ) : (
          <span className="avatar-circle overflow-hidden rounded-full border border-[var(--line)]">
            <Avatar
              src={avatarUrl}
              alt={`${displayName} のアイコン`}
              fallbackText={getAvatarInitials(displayName)}
              size={28}
            />
          </span>
        )}
        <MenuCaret open={open} />
      </button>

      {open ? (
        <div className={resolveMenuPanelClass(menuPlacement, triggerVariant)}>
          {loading ? (
            <div className="px-1 py-3 text-sm text-[var(--text-subtle)]">
              接続中の情報を確認しています
            </div>
          ) : !hasUser || !viewerUsername || !settingsHref ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3">
                <div className="text-sm font-semibold text-[var(--text)]">
                  接続中のウォレット
                </div>
                <div className="mt-1 font-mono text-xs text-[var(--text-subtle)]">
                  {address ? shortAddress(address) : "未接続"}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">
                  まだユーザー登録が完了していません
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                  右上のメニューでは、接続中のウォレット本人の情報だけを扱います。まずは自分の設定からユーザー登録を進めてください。
                </p>
              </div>
              <Link
                href={pageUsername ? `/${pageUsername}/mypage` : "/"}
                className="btn w-full text-center"
                onClick={() => setOpen(false)}
              >
                ユーザー登録へ
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {selfPageHref ? (
                <Link
                  href={selfPageHref}
                  className="block rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3 transition hover:bg-[var(--surface)]"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <span className="avatar-circle overflow-hidden rounded-full border border-[var(--line)]">
                      <Avatar
                        src={avatarUrl}
                        alt={`${displayName} のアイコン`}
                        fallbackText={getAvatarInitials(displayName)}
                        size={40}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--text)]">
                        {displayName}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--text-subtle)]">
                        @{viewerUsername}
                      </span>
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {displayName}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-subtle)]">
                    @{viewerUsername}
                  </div>
                </div>
              )}

              {selfPageHref ? (
                <Link
                  href={selfPageHref}
                  className="menu-item"
                  onClick={() => setOpen(false)}
                >
                  <span className="text-sm">自分のページ</span>
                  <span className="text-xs text-[var(--text-subtle)]">開く</span>
                </Link>
              ) : null}

              {hasCreator && publicSettingsHref ? (
                <Link
                  href={publicSettingsHref}
                  className="menu-item"
                  onClick={() => setOpen(false)}
                >
                  <span className="text-sm">公開ページを整える</span>
                  <span className="text-xs text-[var(--text-subtle)]">開く</span>
                </Link>
              ) : null}

              <Link
                href={settingsHref}
                className="menu-item"
                onClick={() => setOpen(false)}
              >
                <span className="text-sm">設定</span>
                <span className="text-xs text-[var(--text-subtle)]">開く</span>
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
