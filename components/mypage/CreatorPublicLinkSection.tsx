"use client";

import React from "react";

import { withBaseUrl } from "@/utils/baseUrl";

type Props = {
  username: string;
  localProjectId: string | null;
};

export function CreatorPublicLinkSection({ username, localProjectId }: Props) {
  return (
    <div className="card p-0 bg-transparent space-y-2">
      <p className="text-xs text-gray-500">あなたの投げ銭ページ</p>

      <a
        href={withBaseUrl(username)}
        className="text-sm font-mono text-blue-600 underline break-all"
      >
        {withBaseUrl(username)}
      </a>

      {localProjectId && (
        <p className="text-[11px] text-gray-500 mt-2">
          現在の projectId：
          <span className="font-mono">{localProjectId}</span>
        </p>
      )}
    </div>
  );
}
