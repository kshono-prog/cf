"use client";

import { isRecord, toNonEmptyString } from "@/lib/api/guards";

export const POSTING_COMPOSE_HANDOFF_STORAGE_KEY =
  "cf:posting:compose-handoff";

export type PostingComposeHandoff = {
  sourceTaskType: "ANNOUNCEMENT_DRAFT";
  projectId: string | null;
  channel: string;
  summary: string;
  payloadText: string;
  createdAt: string;
};

function normalizeCreatorMypageSupportPath(pathname: string): string {
  const mypageIndex = pathname.indexOf("/mypage");

  if (mypageIndex < 0) {
    return pathname;
  }

  return `${pathname.slice(0, mypageIndex)}/mypage/support-page`;
}

export function buildPostingComposeHref(args: { pathname: string }): string {
  return `${normalizeCreatorMypageSupportPath(args.pathname)}#posting-compose`;
}

export function buildAnnouncementPostingComposeText(args: {
  headline: string;
  body: string;
  callToAction: string | null;
}): string {
  return [args.headline, args.body, args.callToAction].filter(Boolean).join("\n\n");
}

export function buildAnnouncementPostingComposeHandoff(args: {
  projectId: string | null;
  channel: string;
  summary: string;
  headline: string;
  body: string;
  callToAction: string | null;
  createdAt?: string;
}): PostingComposeHandoff {
  return {
    sourceTaskType: "ANNOUNCEMENT_DRAFT",
    projectId: args.projectId,
    channel: args.channel,
    summary: args.summary,
    payloadText: buildAnnouncementPostingComposeText({
      headline: args.headline,
      body: args.body,
      callToAction: args.callToAction,
    }),
    createdAt: args.createdAt ?? new Date().toISOString(),
  };
}

export function parsePostingComposeHandoff(
  value: unknown
): PostingComposeHandoff | null {
  if (!isRecord(value)) {
    return null;
  }

  const sourceTaskType =
    value.sourceTaskType === "ANNOUNCEMENT_DRAFT"
      ? value.sourceTaskType
      : null;
  const projectId =
    value.projectId === null ? null : toNonEmptyString(value.projectId);
  const channel = toNonEmptyString(value.channel);
  const summary = toNonEmptyString(value.summary);
  const payloadText = toNonEmptyString(value.payloadText);
  const createdAt = toNonEmptyString(value.createdAt);

  if (!sourceTaskType || !channel || !summary || !payloadText || !createdAt) {
    return null;
  }

  return {
    sourceTaskType,
    projectId: projectId ?? null,
    channel,
    summary,
    payloadText,
    createdAt,
  };
}
