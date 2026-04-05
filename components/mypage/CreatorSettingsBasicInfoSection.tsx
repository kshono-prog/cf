"use client";

import Image from "next/image";

import { CreatorProfileSection } from "@/components/mypage/CreatorProfileSection";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

type Props = {
  assistantSection?: React.ReactNode;
  missingSetupHints?: string[];
};

export function CreatorSettingsBasicInfoSection(props: Props) {
  const workspace = useCreatorReadyWorkspace();

  if (workspace.editingProfile) {
    return (
      <CreatorProfileSection
        assistantSection={props.assistantSection}
        missingSetupHints={props.missingSetupHints}
      />
    );
  }

  return (
    <section id="basic-info" className="surface-card p-5 sm:p-6">
      {props.assistantSection ? (
        <div className="mb-4">{props.assistantSection}</div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">基本情報</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            公開ページに表示される名前・アイコン・紹介文です。
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={workspace.onStartEditProfile}
        >
          編集する
        </button>
      </div>

      {props.missingSetupHints && props.missingSetupHints.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
            先に整えるとよい項目
          </div>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {props.missingSetupHints.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-[auto,1fr]">
        {workspace.avatarUrl ? (
          <Image
            src={workspace.avatarUrl}
            alt={`${workspace.displayName} のアイコン`}
            width={64}
            height={64}
            quality={95}
            sizes="64px"
            className="avatar-circle h-16 w-16 rounded-full border border-[var(--line)] object-cover"
          />
        ) : (
          <div className="avatar-circle flex h-16 w-16 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] text-lg font-semibold text-[var(--text-subtle)]">
            {(workspace.displayName || workspace.meCreatorUsername).slice(0, 1)}
          </div>
        )}
        <div className="space-y-2">
          <div className="text-lg font-semibold text-[var(--text)]">
            {workspace.displayName || "未設定"}
          </div>
          <div className="text-sm text-[var(--text-subtle)]">
            @{workspace.meCreatorUsername}
          </div>
          <p className="text-sm leading-7 text-[var(--text)]">
            {workspace.profile || "紹介文はまだ設定されていません。"}
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-1 text-xs text-[var(--text-subtle)]">
            <span
              className="inline-block h-3 w-3 rounded-full border border-[var(--line)]"
              style={{
                backgroundColor: workspace.themeColorValue || "#f0f1f4",
              }}
            />
            背景トーン
          </div>
        </div>
      </div>
    </section>
  );
}
