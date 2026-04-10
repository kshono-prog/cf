"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";

import { ensureCreatorProfileQrCode } from "@/lib/api/creator";
import {
  buildCreatorProfilePublicUrl,
  isReusableCreatorProfileQrCodeUrl,
  resolveCreatorProfileQrCodeImageSrc,
} from "@/lib/profileQrCode";

import { withBaseUrl } from "@/utils/baseUrl";

type Props = {
  username: string;
  localProjectId: string | null;
  walletAddress: `0x${string}` | null;
  initialQrcodeUrl: string | null;
};

export function CreatorPublicLinkSection({
  username,
  localProjectId,
  walletAddress,
  initialQrcodeUrl,
}: Props) {
  const [resolvedBaseUrl, setResolvedBaseUrl] = useState<string>("");
  const [qrcodeUrl, setQrcodeUrl] = useState<string | null>(initialQrcodeUrl);
  const [qrcodeStatus, setQrcodeStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >(
    isReusableCreatorProfileQrCodeUrl(initialQrcodeUrl, username)
      ? "ready"
      : "idle"
  );
  const [qrcodeError, setQrcodeError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setResolvedBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    if (isReusableCreatorProfileQrCodeUrl(qrcodeUrl, username)) {
      setQrcodeStatus("ready");
      return;
    }

    let cancelled = false;
    setQrcodeStatus("loading");
    setQrcodeError(null);

    void ensureCreatorProfileQrCode({
      address: walletAddress,
      force: false,
    }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setQrcodeStatus("error");
        setQrcodeError("QRコードの準備に失敗しました。");
        return;
      }

      setQrcodeUrl(result.qrcodeUrl);
      setQrcodeStatus("ready");

      try {
        const nextTargetUrl = new URL(result.targetUrl);
        setResolvedBaseUrl(nextTargetUrl.origin);
      } catch {
        // Ignore invalid targetUrl and keep the current base URL fallback.
      }
    });

    return () => {
      cancelled = true;
    };
  }, [qrcodeUrl, retryNonce, username, walletAddress]);

  const publicProfileUrl = resolvedBaseUrl
    ? buildCreatorProfilePublicUrl(username, resolvedBaseUrl)
    : `/${encodeURIComponent(username)}`;
  const publicEventsUrl = resolvedBaseUrl
    ? withBaseUrl(`/${encodeURIComponent(username)}/events`, resolvedBaseUrl)
    : `/${encodeURIComponent(username)}/events`;
  const qrImageSrc = resolveCreatorProfileQrCodeImageSrc({
    username,
    qrcodeUrl,
  });

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            Public Link
          </div>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
            公開ページのリンク
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            見え方の確認と、SNS で広めるときの入口に使えます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={publicProfileUrl}
            target="_blank"
            rel="noreferrer"
            className="btn"
          >
            公開ページを開く
          </a>
          <a
            href={publicEventsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            イベント一覧を開く
          </a>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
          <div className="text-xs font-medium text-[var(--text-subtle)]">
            公開ページ URL
          </div>
          <div className="mt-2 break-all font-mono text-sm text-sky-700">
            {publicProfileUrl}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
          <div className="text-xs font-medium text-[var(--text-subtle)]">
            イベントページ URL
          </div>
          <div className="mt-2 break-all font-mono text-sm text-sky-700">
            {publicEventsUrl}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-fit rounded-2xl border border-[var(--line)] bg-white p-2 shadow-sm">
            <Image
              unoptimized
              src={qrImageSrc}
              alt={`${username} の公開プロフィール QRコード`}
              width={104}
              height={104}
              className="h-[104px] w-[104px] rounded-xl"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
              Profile QR
            </div>
            <h3 className="mt-1 text-sm font-semibold text-[var(--text)]">
              スマホでこのプロフィールを開く
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
              現在開いているデプロイ先の公開プロフィール URL を QR にしています。
            </p>
            <div className="mt-2 break-all font-mono text-xs text-sky-700">
              {publicProfileUrl}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-subtle)]">
              <span>
                {qrcodeStatus === "loading"
                  ? "QRコードを準備しています…"
                  : qrcodeStatus === "ready"
                    ? "現在のプロフィールURLに合わせて表示中"
                    : "QRコードを表示できます"}
              </span>
              {qrcodeError ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setQrcodeError(null);
                    setRetryNonce((value) => value + 1);
                  }}
                >
                  再試行
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {localProjectId ? (
        <p className="mt-3 text-[11px] text-[var(--text-subtle)]">
          現在の projectId: <span className="font-mono">{localProjectId}</span>
        </p>
      ) : null}
    </section>
  );
}
