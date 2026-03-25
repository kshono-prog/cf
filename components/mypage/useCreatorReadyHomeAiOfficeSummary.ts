"use client";

import { useEffect, useState } from "react";

import {
  parseAiOfficeContentSummary,
  parseAiOfficeTasks,
  parseAiOfficeUsefulnessSummary,
} from "@/components/mypage/aiOfficeDashboardParsers";
import type {
  AgentTaskView,
  AiOfficeContentSummaryView,
  AiOfficeUsefulnessSummaryView,
} from "@/components/mypage/aiOfficeTypes";
import { getEmptyAiOfficeUsefulnessSummary } from "@/components/mypage/aiOfficeTypes";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type CreatorReadyHomeAiOfficeSummary = {
  loading: boolean;
  error: string | null;
  tasks: AgentTaskView[];
  usefulness: AiOfficeUsefulnessSummaryView;
  contentSummary: AiOfficeContentSummaryView;
};

const EMPTY_CONTENT_SUMMARY: AiOfficeContentSummaryView = {
  totalPosts: 0,
  publishedPosts: 0,
  draftPosts: 0,
  archivedPosts: 0,
  aiGeneratedPosts: 0,
  lastPostAt: null,
  lastPublishedAt: null,
};

export function useCreatorReadyHomeAiOfficeSummary(args: {
  address: string | undefined;
  projectId: string | null;
  isConnected: boolean;
}): CreatorReadyHomeAiOfficeSummary {
  const [state, setState] = useState<CreatorReadyHomeAiOfficeSummary>({
    loading: false,
    error: null,
    tasks: [],
    usefulness: getEmptyAiOfficeUsefulnessSummary(),
    contentSummary: EMPTY_CONTENT_SUMMARY,
  });

  useEffect(() => {
    const address = args.address;

    if (!args.isConnected || !address) {
      setState({
        loading: false,
        error: null,
        tasks: [],
        usefulness: getEmptyAiOfficeUsefulnessSummary(),
        contentSummary: EMPTY_CONTENT_SUMMARY,
      });
      return;
    }

    const ownerAddress: string = address;

    let cancelled = false;

    async function load(): Promise<void> {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const searchParams = new URLSearchParams();
        searchParams.set("address", ownerAddress);
        searchParams.set("taskLimit", "20");
        searchParams.set("metricLimit", "1");
        searchParams.set("trendDays", "7");
        if (args.projectId) {
          searchParams.set("projectId", args.projectId);
        }

        const response = await ownerAuthFetch({
          address: ownerAddress,
          url: `/api/ai-office/dashboard?${searchParams.toString()}`,
        });
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error("AI_OFFICE_HOME_DASHBOARD_FAILED");
        }

        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          error: null,
          tasks: parseAiOfficeTasks(json),
          usefulness: parseAiOfficeUsefulnessSummary(
            typeof json === "object" && json !== null && "usefulness" in json
              ? (json as { usefulness?: unknown }).usefulness
              : null
          ),
          contentSummary: parseAiOfficeContentSummary(
            typeof json === "object" && json !== null && "content" in json
              ? (json as { content?: unknown }).content
              : null
          ),
        });
      } catch {
        if (cancelled) {
          return;
        }
        setState({
          loading: false,
          error: "AI_HOME_SUMMARY_UNAVAILABLE",
          tasks: [],
          usefulness: getEmptyAiOfficeUsefulnessSummary(),
          contentSummary: EMPTY_CONTENT_SUMMARY,
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [args.address, args.isConnected, args.projectId]);

  return state;
}
