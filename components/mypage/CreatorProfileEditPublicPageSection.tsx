"use client";

import { useEffect, useState } from "react";

import {
  CREATOR_TYPE_LABELS,
  CREATOR_TYPE_OPTIONS,
  ECOSYSTEM_ROLE_LABELS,
  ECOSYSTEM_ROLE_OPTIONS,
  isCreatorType,
  isEcosystemRole,
} from "@/lib/creatorTaxonomy";
import { SocialLinksEditor } from "@/components/mypage/SocialLinksEditor";
import { YoutubeVideosEditor } from "@/components/mypage/YoutubeVideosEditor";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import {
  normalizeOptionalHexColor,
  normalizeOptionalHttpUrl,
  PUBLIC_PAGE_CENTER_SECTION_LABELS,
  PUBLIC_PAGE_INTRO_SECTION_LABELS,
  PUBLIC_PAGE_RIGHT_SECTION_LABELS,
  type CreatorPublicPageConfig,
  type PublicPageCenterSectionKey,
  type PublicPageIntroSectionKey,
  type PublicPageRightSectionKey,
} from "@/lib/publicPageConfig";

function moveArrayItem<T>(values: readonly T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= values.length) {
    return [...values];
  }

  const next = [...values];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

function toggleHiddenKey<T extends string>(
  hiddenKeys: readonly T[],
  key: T,
  hidden: boolean
): T[] {
  if (hidden) {
    return hiddenKeys.includes(key) ? [...hiddenKeys] : [...hiddenKeys, key];
  }

  return hiddenKeys.filter((item) => item !== key);
}

function PublicPageSectionOrderEditor<T extends string>(props: {
  title: string;
  helper: string;
  orderedKeys: readonly T[];
  hiddenKeys: readonly T[];
  labels: Record<T, string>;
  disabled: boolean;
  allowHide?: boolean;
  onMove: (key: T, direction: -1 | 1) => void;
  onToggleHidden?: (key: T, hidden: boolean) => void;
}) {
  const allowHide = props.allowHide !== false;

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div>
        <div className="text-sm font-semibold text-[var(--text)]">{props.title}</div>
        <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
          {props.helper}
        </p>
      </div>

      <div className="space-y-2">
        {props.orderedKeys.map((key, index) => {
          const hidden = allowHide ? props.hiddenKeys.includes(key) : false;
          const isFirst = index === 0;
          const isLast = index === props.orderedKeys.length - 1;

          return (
            <div
              key={key}
              className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text)]">
                  {props.labels[key]}
                </div>
                <p className="mt-1 text-xs text-[var(--text-subtle)]">
                  {hidden
                    ? "現在は非表示です。"
                    : "公開ページに表示されます。"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {allowHide ? (
                  <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-xs"
                    onClick={() => props.onToggleHidden?.(key, !hidden)}
                    disabled={props.disabled}
                  >
                    {hidden ? "表示する" : "非表示にする"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-xs"
                  onClick={() => props.onMove(key, -1)}
                  disabled={props.disabled || isFirst}
                >
                  上へ
                </button>
                <button
                  type="button"
                  className="btn-secondary px-3 py-2 text-xs"
                  onClick={() => props.onMove(key, 1)}
                  disabled={props.disabled || isLast}
                >
                  下へ
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CreatorProfileEditPublicPageSection() {
  const workspace = useCreatorReadyWorkspace();
  const [heroImageDraft, setHeroImageDraft] = useState(
    workspace.publicPage.heroImageUrl ?? ""
  );
  const [backgroundColorDraft, setBackgroundColorDraft] = useState(
    workspace.publicPage.backgroundColor ?? ""
  );
  const heroImageInvalid =
    heroImageDraft.trim().length > 0 &&
    normalizeOptionalHttpUrl(heroImageDraft) === null;
  const backgroundColorInvalid =
    backgroundColorDraft.trim().length > 0 &&
    normalizeOptionalHexColor(backgroundColorDraft) === null;

  useEffect(() => {
    setHeroImageDraft(workspace.publicPage.heroImageUrl ?? "");
  }, [workspace.publicPage.heroImageUrl]);

  useEffect(() => {
    setBackgroundColorDraft(workspace.publicPage.backgroundColor ?? "");
  }, [workspace.publicPage.backgroundColor]);

  const updatePublicPage = (patch: Partial<CreatorPublicPageConfig>) => {
    workspace.setPublicPage((current) => ({
      ...current,
      ...patch,
    }));
  };

  const handleHeroImageChange = (value: string) => {
    setHeroImageDraft(value);

    if (!value.trim()) {
      updatePublicPage({ heroImageUrl: null });
      return;
    }

    const normalized = normalizeOptionalHttpUrl(value);
    if (normalized) {
      updatePublicPage({ heroImageUrl: normalized });
    }
  };

  const handleBackgroundColorChange = (value: string) => {
    setBackgroundColorDraft(value);

    if (!value.trim()) {
      updatePublicPage({ backgroundColor: null });
      return;
    }

    const normalized = normalizeOptionalHexColor(value);
    if (normalized) {
      updatePublicPage({ backgroundColor: normalized });
    }
  };

  const handleCenterSectionMove = (
    key: PublicPageCenterSectionKey,
    direction: -1 | 1
  ) => {
    const currentIndex = workspace.publicPage.centerSectionOrder.indexOf(key);
    if (currentIndex < 0) return;

    updatePublicPage({
      centerSectionOrder: moveArrayItem(
        workspace.publicPage.centerSectionOrder,
        currentIndex,
        direction
      ),
    });
  };

  const handleRightSectionMove = (
    key: PublicPageRightSectionKey,
    direction: -1 | 1
  ) => {
    const currentIndex = workspace.publicPage.rightSectionOrder.indexOf(key);
    if (currentIndex < 0) return;

    updatePublicPage({
      rightSectionOrder: moveArrayItem(
        workspace.publicPage.rightSectionOrder,
        currentIndex,
        direction
      ),
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div>
        <div className="text-base font-semibold text-[var(--text)]">
          公開ページ
        </div>
        <p className="mt-1 text-sm text-[var(--text-subtle)]">
          外部リンクに加えて、トップ画像、背景色、表示順、表示・非表示も整えます。
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">
            ページスタイル
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
            公開プロフィールの第一印象を決めるトップ画像と背景色を設定します。
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text)]">
            トップ画像 URL
          </label>
          <input
            type="url"
            className="input"
            value={heroImageDraft}
            onChange={(e) => handleHeroImageChange(e.target.value)}
            placeholder="https://example.com/cover.jpg"
            disabled={workspace.saving}
          />
          <p className="mt-1 text-xs text-[var(--text-subtle)]">
            http(s) の画像 URL を使えます。未設定なら現在のアクセントカラーで表示します。
          </p>
          {heroImageInvalid ? (
            <p className="mt-1 text-xs text-rose-600">
              画像 URL は `http://` または `https://` 形式で入力してください。
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text)]">
            ページ背景色
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="color"
              className="h-11 w-14 rounded-xl border border-[var(--line)] bg-[var(--surface)]"
              value={workspace.publicPage.backgroundColor ?? "#f4f6fb"}
              onChange={(e) => handleBackgroundColorChange(e.target.value)}
              disabled={workspace.saving}
            />
            <input
              type="text"
              className="input min-w-[180px] flex-1"
              value={backgroundColorDraft}
              onChange={(e) => handleBackgroundColorChange(e.target.value)}
              placeholder="#f4f6fb"
              disabled={workspace.saving}
            />
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-xs"
              onClick={() => handleBackgroundColorChange("")}
              disabled={workspace.saving}
            >
              未設定に戻す
            </button>
          </div>
          {backgroundColorInvalid ? (
            <p className="mt-1 text-xs text-rose-600">
              背景色は `#rrggbb` または `#rgb` の形式で入力してください。
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text)]">
          外部リンク
        </label>
        <input
          type="url"
          className="input"
          value={workspace.externalUrl}
          onChange={(e) => workspace.setExternalUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={workspace.saving}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text)]">
          クリエイターの種類
        </label>
        <select
          className="input"
          value={workspace.creatorType ?? ""}
          onChange={(e) => {
            const nextValue = e.target.value;
            workspace.setCreatorType(
              nextValue === ""
                ? null
                : isCreatorType(nextValue)
                  ? nextValue
                  : null
            );
          }}
          disabled={workspace.saving}
        >
          <option value="">未設定</option>
          {CREATOR_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {CREATOR_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text)]">
          エコシステムロール
        </label>
        <select
          className="input"
          value={workspace.ecosystemRole ?? ""}
          onChange={(e) => {
            const nextValue = e.target.value;
            workspace.setEcosystemRole(
              nextValue === ""
                ? null
                : isEcosystemRole(nextValue)
                  ? nextValue
                  : null
            );
          }}
          disabled={workspace.saving}
        >
          <option value="">未設定</option>
          {ECOSYSTEM_ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {ECOSYSTEM_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--text-subtle)]">
          クリエイター・マネージャー・コラボレーターのいずれかを選択できます。
        </p>
      </div>

      <PublicPageSectionOrderEditor
        title="ページ上部"
        helper="Support / FAQ / Video の順番を入れ替えられます。"
        orderedKeys={workspace.publicPage.introSectionOrder}
        hiddenKeys={[]}
        labels={PUBLIC_PAGE_INTRO_SECTION_LABELS}
        disabled={workspace.saving}
        allowHide={false}
        onMove={(key, direction) => {
          const currentIndex = workspace.publicPage.introSectionOrder.indexOf(
            key as PublicPageIntroSectionKey
          );
          if (currentIndex < 0) return;

          updatePublicPage({
            introSectionOrder: moveArrayItem(
              workspace.publicPage.introSectionOrder,
              currentIndex,
              direction
            ),
          });
        }}
      />

      <PublicPageSectionOrderEditor
        title="中央カラム"
        helper="外部ウォレット QR、コミュニティ、ガイド、投稿の順番と表示状態を調整できます。"
        orderedKeys={workspace.publicPage.centerSectionOrder}
        hiddenKeys={workspace.publicPage.hiddenCenterSectionKeys}
        labels={PUBLIC_PAGE_CENTER_SECTION_LABELS}
        disabled={workspace.saving}
        onMove={handleCenterSectionMove}
        onToggleHidden={(key, hidden) =>
          updatePublicPage({
            hiddenCenterSectionKeys: toggleHiddenKey(
              workspace.publicPage.hiddenCenterSectionKeys,
              key,
              hidden
            ),
          })
        }
      />

      <PublicPageSectionOrderEditor
        title="右カラム"
        helper="右サイドの紹介カードや実績カードの並び順と表示状態を調整できます。"
        orderedKeys={workspace.publicPage.rightSectionOrder}
        hiddenKeys={workspace.publicPage.hiddenRightSectionKeys}
        labels={PUBLIC_PAGE_RIGHT_SECTION_LABELS}
        disabled={workspace.saving}
        onMove={handleRightSectionMove}
        onToggleHidden={(key, hidden) =>
          updatePublicPage({
            hiddenRightSectionKeys: toggleHiddenKey(
              workspace.publicPage.hiddenRightSectionKeys,
              key,
              hidden
            ),
          })
        }
      />

      <SocialLinksEditor
        socials={workspace.socials}
        onChange={workspace.setSocials}
        disabled={workspace.saving}
      />

      <YoutubeVideosEditor
        youtubeVideos={workspace.youtubeVideos}
        onChange={workspace.setYoutubeVideos}
        disabled={workspace.saving}
      />
    </div>
  );
}
