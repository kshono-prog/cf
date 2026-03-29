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
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
          <div className="text-xs font-medium text-[var(--text-subtle)]">
            公開ページ URL
          </div>
          <div className="mt-2 break-all font-mono text-sm text-sky-700">
            {publicProfileUrl}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
          <div className="text-xs font-medium text-[var(--text-subtle)]">
            イベントページ URL
          </div>
          <div className="mt-2 break-all font-mono text-sm text-sky-700">
            {publicEventsUrl}
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
