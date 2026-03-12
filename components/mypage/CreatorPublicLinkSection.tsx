"use client";

import React from "react";

import { withBaseUrl } from "@/utils/baseUrl";

type Props = {
  username: string;
  localProjectId: string | null;
};

export function CreatorPublicLinkSection({ username, localProjectId }: Props) {
  const publicProfileUrl = withBaseUrl(username);
  const publicEventsUrl = withBaseUrl(`${username}/events`);

  return (
    <div className="card p-0 bg-transparent space-y-3">
      <p className="text-xs text-gray-500">公開URL</p>

      <a
        href={publicProfileUrl}
        className="text-sm font-mono text-blue-600 underline break-all"
      >
        {publicProfileUrl}
      </a>

      <a
        href={publicEventsUrl}
        className="text-sm font-mono text-blue-600 underline break-all"
      >
        {publicEventsUrl}
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
