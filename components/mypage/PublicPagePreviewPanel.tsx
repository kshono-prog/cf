"use client";

import React, { useMemo, useState } from "react";

type Props = {
  username: string;
  publicProfileHref: string;
};

type ViewportMode = "desktop" | "mobile";

function viewportButtonClass(active: boolean): string {
  return active ? "btn" : "btn-secondary";
}

export function PublicPagePreviewPanel({
  username,
  publicProfileHref,
}: Props) {
  const [enabled, setEnabled] = useState(false);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [reloadNonce, setReloadNonce] = useState(0);

  const iframeSrc = useMemo(() => {
    const encodedUsername = encodeURIComponent(username);
    const params = new URLSearchParams({
      preview: "1",
      n: String(reloadNonce),
    });
    return `/${encodedUsername}?${params.toString()}`;
  }, [reloadNonce, username]);

  const frameWrapperClassName =
    viewportMode === "mobile" ? "max-w-[420px]" : "w-full";

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
            Preview
          </div>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
            公開ページプレビュー
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            保存済みの公開ページを、この画面のまま確認できます。重いので必要なときだけ読み込みます。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={publicProfileHref}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            別タブで開く ↗
          </a>
          {enabled ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setReloadNonce((value) => value + 1)}
            >
              リロード
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => setEnabled(true)}>
              プレビューを読み込む
            </button>
          )}
        </div>
      </div>

      {enabled ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={viewportButtonClass(viewportMode === "desktop")}
              onClick={() => setViewportMode("desktop")}
            >
              デスクトップ
            </button>
            <button
              type="button"
              className={viewportButtonClass(viewportMode === "mobile")}
              onClick={() => setViewportMode("mobile")}
            >
              モバイル
            </button>
            <span className="text-xs text-[var(--text-subtle)]">
              {viewportMode === "mobile"
                ? "スマホ幅で中央に寄せて表示します。"
                : "画面幅いっぱいで表示します。"}
            </span>
          </div>

          <div className="flex justify-center">
            <div className={`w-full ${frameWrapperClassName}`.trim()}>
              <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
                <iframe
                  title={`${username} 公開ページプレビュー`}
                  src={iframeSrc}
                  className="h-[780px] w-full"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs leading-5 text-[var(--text-subtle)]">
          設定を保存したあとに「プレビューを読み込む」を押すと、公開ページの見え方を確認できます。
        </p>
      )}
    </section>
  );
}

