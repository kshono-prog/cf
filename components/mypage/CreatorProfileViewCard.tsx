"use client";

import { CREATOR_TYPE_LABELS } from "@/lib/creatorTaxonomy";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

type Props = {
  missingSetupHints?: string[];
};

export function CreatorProfileViewCard({ missingSetupHints = [] }: Props) {
  const workspace = useCreatorReadyWorkspace();

  return (
    <div className="surface-card space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-[var(--text)]">
            プロフィール
          </div>
          <div className="mt-1 text-sm text-[var(--text-subtle)]">
            公開される見た目の簡易プレビューです。
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={workspace.onStartEditProfile}
        >
          編集
        </button>
      </div>

      <div className="flex items-center gap-3">
        {workspace.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={workspace.avatarUrl}
            alt="avatar"
            className="avatar-circle h-14 w-14 rounded-full border border-[var(--line)] object-cover"
          />
        ) : (
          <div className="avatar-circle h-14 w-14 rounded-full border border-[var(--line)] bg-[var(--surface-subtle)]" />
        )}

        <div>
          <div className="text-base font-semibold text-[var(--text)]">
            {workspace.displayName || "（未設定）"}
          </div>
          <div className="mt-1 text-sm whitespace-pre-wrap text-[var(--text-subtle)]">
            {workspace.profile || "（未設定）"}
          </div>
        </div>
      </div>

      {workspace.creatorType ? (
        <div className="surface-subtle space-y-2 p-3">
          <div className="text-sm text-[var(--text)]">
            種類: {CREATOR_TYPE_LABELS[workspace.creatorType]}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="surface-subtle p-3 text-sm text-[var(--text-subtle)]">
          <div className="font-medium text-[var(--text)]">外部リンク</div>
          <div className="mt-2 break-all">
            {workspace.externalUrl || "未設定"}
          </div>
        </div>
        <div className="surface-subtle p-3 text-sm text-[var(--text-subtle)]">
          <div className="font-medium text-[var(--text)]">背景トーン</div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded-full border border-[var(--line)]"
              style={{
                backgroundColor: workspace.themeColorValue || "#f0f1f4",
              }}
            />
            {workspace.themeColorValue || "未設定"}
          </div>
        </div>
      </div>

      <div className="space-y-1 text-sm text-[var(--text-subtle)]">
        {workspace.socials.website ? (
          <div>Web: {workspace.socials.website}</div>
        ) : null}
        {workspace.socials.twitter ? (
          <div>X: {workspace.socials.twitter}</div>
        ) : null}
        {workspace.socials.instagram ? (
          <div>Instagram: {workspace.socials.instagram}</div>
        ) : null}
        {workspace.socials.youtube ? (
          <div>YouTube: {workspace.socials.youtube}</div>
        ) : null}
        {workspace.socials.tiktok ? (
          <div>TikTok: {workspace.socials.tiktok}</div>
        ) : null}
        {workspace.socials.facebook ? (
          <div>Facebook: {workspace.socials.facebook}</div>
        ) : null}
      </div>

      {missingSetupHints.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            公開前に整えたい項目
          </div>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {missingSetupHints.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {workspace.youtubeVideos.length > 0 &&
      workspace.youtubeVideos.some((video) => video.url.trim()) ? (
        <div className="border-t border-[var(--line)] pt-4">
          <div className="text-sm font-semibold text-[var(--text)]">
            紹介動画
          </div>
          <ul className="mt-2 space-y-1 text-sm text-[var(--text-subtle)]">
            {workspace.youtubeVideos
              .filter((video) => video.url.trim())
              .slice(0, 3)
              .map((video, index) => (
                <li key={index} className="break-all">
                  {video.title?.trim() ? `${video.title}: ` : ""}
                  {video.url}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
