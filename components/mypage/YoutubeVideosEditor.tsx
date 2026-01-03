// components/mypage/YoutubeVideosEditor.tsx
"use client";

import React from "react";
import type { YoutubeVideo } from "@/types/creator";

type Props = {
  youtubeVideos: YoutubeVideo[];
  onChange: (next: YoutubeVideo[]) => void;
  disabled?: boolean;
};

export function YoutubeVideosEditor({
  youtubeVideos,
  onChange,
  disabled = false,
}: Props) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">YouTube動画</label>

      <div className="space-y-3">
        {youtubeVideos.map((video, idx) => (
          <div
            key={idx}
            className="border rounded-md p-2 space-y-2 text-xs bg-white"
          >
            <div>
              <label className="block mb-1">動画URL</label>
              <input
                type="url"
                className="input"
                placeholder="https://www.youtube.com/watch?v=..."
                value={video.url}
                disabled={disabled}
                onChange={(e) => {
                  const next = youtubeVideos.map((v, i) =>
                    i === idx ? { ...v, url: e.target.value } : v
                  );
                  onChange(next);
                }}
              />
            </div>

            <div>
              <label className="block mb-1">タイトル</label>
              <input
                type="text"
                className="input"
                value={video.title}
                disabled={disabled}
                onChange={(e) => {
                  const next = youtubeVideos.map((v, i) =>
                    i === idx ? { ...v, title: e.target.value } : v
                  );
                  onChange(next);
                }}
              />
            </div>

            <div>
              <label className="block mb-1">説明</label>
              <textarea
                className="input min-h-[40px]"
                value={video.description}
                disabled={disabled}
                onChange={(e) => {
                  const next = youtubeVideos.map((v, i) =>
                    i === idx ? { ...v, description: e.target.value } : v
                  );
                  onChange(next);
                }}
              />
            </div>

            {youtubeVideos.length > 1 && (
              <button
                type="button"
                className="text-[11px] text-red-500 underline"
                disabled={disabled}
                onClick={() => {
                  const next = youtubeVideos.filter((_, i) => i !== idx);
                  onChange(next);
                }}
              >
                この動画を削除
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-2 text-[11px] text-blue-600 underline"
        disabled={disabled}
        onClick={() => {
          onChange([...youtubeVideos, { url: "", title: "", description: "" }]);
        }}
      >
        ＋ 動画を追加
      </button>
    </div>
  );
}
