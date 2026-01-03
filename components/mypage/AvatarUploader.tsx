// components/mypage/AvatarUploader.tsx
"use client";

import React, { useEffect } from "react";

type Props = {
  avatarUrl: string;
  avatarPreview: string | null;
  avatarFile: File | null;

  onSelectFile: (file: File, previewUrl: string) => void;
  onClearFile: () => void;

  /**
   * 現行UIのまま hidden input + label クリックで選択
   * 呼び出し側が id を合わせたい場合に渡す
   */
  inputId?: string;

  disabled?: boolean;
};

export function AvatarUploader({
  avatarUrl,
  avatarPreview,
  avatarFile,
  onSelectFile,
  onClearFile,
  inputId = "avatarFileInput",
  disabled = false,
}: Props) {
  // 既存実装は「新しいファイルを選んだときのみ revoke」だったが、
  // ここでは「アンマウント時に preview を revoke」も追加し、リークを防ぐ。
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  return (
    <div>
      <label className="block text-xs font-medium mb-1">アバター画像</label>

      <div className="flex items-center gap-3 mb-2">
        {(avatarPreview || avatarUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarPreview || avatarUrl}
            alt="avatar preview"
            className="h-12 w-12 rounded-full object-cover border"
          />
        )}
        <div className="text-[11px] text-gray-500">
          <p>画像ファイル（正方形推奨）を選択してください。</p>
          <p>※ 1MB 前後のサイズを推奨します。</p>
        </div>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const url = URL.createObjectURL(file);
          onSelectFile(file, url);

          // 同じファイルを連続選択できるよう input をリセット
          e.currentTarget.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100"
      >
        画像ファイルを選択
      </label>

      {avatarFile && (
        <div className="mt-1 space-y-1">
          <p className="text-[11px] text-gray-500 break-all">
            選択中：{avatarFile.name}
          </p>

          {/* 現行UIに無かったが、運用上便利なので追加したい場合は使える。
              ただし「現行UI維持」優先なら、このボタンは呼び出し側で出さないでもOK。 */}
          <button
            type="button"
            className="text-[11px] text-red-500 underline"
            onClick={() => {
              onClearFile();
            }}
            disabled={disabled}
          >
            選択を解除
          </button>
        </div>
      )}
    </div>
  );
}
