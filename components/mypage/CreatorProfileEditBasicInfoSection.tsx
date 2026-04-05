"use client";

import { AvatarUploader } from "@/components/mypage/AvatarUploader";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

export function CreatorProfileEditBasicInfoSection() {
  const workspace = useCreatorReadyWorkspace();

  const handleSelectFile = (file: File, previewUrl: string) => {
    if (workspace.avatarPreview) {
      URL.revokeObjectURL(workspace.avatarPreview);
    }
    workspace.setAvatarFile(file);
    workspace.setAvatarPreview(previewUrl);
  };

  const handleClearFile = () => {
    if (workspace.avatarPreview) {
      URL.revokeObjectURL(workspace.avatarPreview);
    }
    workspace.setAvatarFile(null);
    workspace.setAvatarPreview(null);
  };

  return (
    <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
      <div>
        <div className="text-base font-semibold text-[var(--text)]">
          基本情報
        </div>
        <p className="mt-1 text-sm text-[var(--text-subtle)]">
          表示名、ユーザー名、紹介文、アイコン、背景トーンを整えます。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text)]">
            名前
          </label>
          <input
            type="text"
            className="input"
            value={workspace.displayName}
            onChange={(e) => workspace.setDisplayName(e.target.value)}
            required
            disabled={workspace.saving}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--text)]">
            ユーザー名
          </label>
          <input
            type="text"
            className="input"
            value={workspace.meCreatorUsername}
            disabled
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text)]">
          紹介文
        </label>
        <textarea
          className="input min-h-[120px]"
          value={workspace.profile}
          onChange={(e) => workspace.setProfile(e.target.value)}
          disabled={workspace.saving}
        />
      </div>

      <AvatarUploader
        avatarUrl={workspace.avatarUrl}
        avatarPreview={workspace.avatarPreview}
        avatarFile={workspace.avatarFile}
        disabled={workspace.saving}
        onSelectFile={handleSelectFile}
        onClearFile={handleClearFile}
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text)]">
          背景トーン
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-11 w-14 rounded-xl border border-[var(--line)] bg-[var(--surface)]"
            value={workspace.themeColorValue || "#2563eb"}
            onChange={(e) => workspace.setThemeColor(e.target.value)}
            disabled={workspace.saving}
          />
          <input
            type="text"
            className="input flex-1"
            placeholder="#2563eb"
            value={workspace.themeColorValue ?? ""}
            onChange={(e) => workspace.setThemeColor(e.target.value)}
            disabled={workspace.saving}
          />
        </div>
      </div>
    </div>
  );
}
