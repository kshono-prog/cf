"use client";

import React from "react";
import type { Address } from "viem";

import {
  createPostingAiAgent,
  createPostingAiJob,
  fetchPostingAiAgents,
  fetchPostingAiJobs,
  type PostingAiAgent,
  type PostingAiJob,
} from "@/lib/mypage/postingApi";
import {
  WorkspaceEmptyState,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import {
  buildWorkspaceActionSuccessNotice,
  mapWorkspaceActionError,
  type WorkspaceActionNotice,
} from "@/lib/mypage/workspaceActionCopy";
import { AI_OFFICE_LABEL } from "@/lib/uxCopy";

type Props = {
  address: Address | undefined;
  refreshToken: number;
  onChanged: () => void;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoleLabel(role: PostingAiAgent["role"]): string {
  switch (role) {
    case "POSTER":
      return "投稿担当";
    case "ANALYST":
      return "分析担当";
    case "PROMOTER":
      return "告知担当";
    case "REPLY_AGENT":
      return "返信担当";
  }
}

function getJobTypeLabel(jobType: PostingAiJob["jobType"]): string {
  switch (jobType) {
    case "AUTO_POST":
      return "自動投稿";
    case "AUTO_REPLY":
      return "自動返信";
    case "ANALYZE":
      return "分析";
    case "PROMOTE":
      return "告知";
  }
}

export function AiAgencyCard(props: Props) {
  const [agents, setAgents] = React.useState<PostingAiAgent[]>([]);
  const [jobs, setJobs] = React.useState<PostingAiJob[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [feedback, setFeedback] = React.useState<WorkspaceActionNotice | null>(null);
  const [agentName, setAgentName] = React.useState("");
  const [agentRole, setAgentRole] = React.useState<PostingAiAgent["role"]>("POSTER");
  const [jobType, setJobType] = React.useState<PostingAiJob["jobType"]>("ANALYZE");
  const [selectedAgentId, setSelectedAgentId] = React.useState<string>("");
  const [savingAgent, setSavingAgent] = React.useState(false);
  const [savingJob, setSavingJob] = React.useState(false);

  const loadData = React.useCallback(async (): Promise<void> => {
    if (!props.address) {
      setAgents([]);
      setJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFeedback(null);

    const [agentsResult, jobsResult] = await Promise.all([
      fetchPostingAiAgents({ address: props.address }),
      fetchPostingAiJobs({ address: props.address }),
    ]);

    if (!agentsResult.ok) {
      setFeedback(
        mapWorkspaceActionError(
          agentsResult.error,
          "AI agent の取得に失敗しました。"
        )
      );
      setLoading(false);
      return;
    }
    if (!jobsResult.ok) {
      setFeedback(
        mapWorkspaceActionError(
          jobsResult.error,
          "AI job の取得に失敗しました。"
        )
      );
      setLoading(false);
      return;
    }

    setAgents(agentsResult.agents);
    setJobs(jobsResult.jobs);
    setLoading(false);
  }, [props.address]);

  React.useEffect(() => {
    void loadData();
  }, [loadData, props.refreshToken]);

  async function handleCreateAgent(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    if (!props.address) {
      setFeedback(
        mapWorkspaceActionError(
          "WALLET_NOT_CONNECTED",
          "ウォレット接続を確認してください。"
        )
      );
      return;
    }

    const trimmedName = agentName.trim();
    if (!trimmedName) {
      setFeedback(
        mapWorkspaceActionError("AI_AGENT_NAME_REQUIRED", "agent 名を入力してください。")
      );
      return;
    }

    setSavingAgent(true);
    setFeedback(null);

    const result = await createPostingAiAgent({
      address: props.address,
      name: trimmedName,
      role: agentRole,
    });

    if (!result.ok) {
      setFeedback(
        mapWorkspaceActionError(
          result.error,
          "AI agent の作成に失敗しました。"
        )
      );
      setSavingAgent(false);
      return;
    }

    setAgentName("");
    setFeedback(buildWorkspaceActionSuccessNotice("aiAgentCreated"));
    setSavingAgent(false);
    await loadData();
    props.onChanged();
  }

  async function handleQueueJob(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    if (!props.address) {
      setFeedback(
        mapWorkspaceActionError(
          "WALLET_NOT_CONNECTED",
          "ウォレット接続を確認してください。"
        )
      );
      return;
    }

    setSavingJob(true);
    setFeedback(null);

    const result = await createPostingAiJob({
      address: props.address,
      jobType,
      aiAgentId: selectedAgentId || null,
    });

    if (!result.ok) {
      setFeedback(
        mapWorkspaceActionError(
          result.error,
          "AI job のキュー登録に失敗しました。"
        )
      );
      setSavingJob(false);
      return;
    }

    setFeedback(buildWorkspaceActionSuccessNotice("aiJobQueued"));
    setSavingJob(false);
    await loadData();
    props.onChanged();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-gray-900">{AI_OFFICE_LABEL}</div>
        <div className="mt-1 text-xs leading-5 text-gray-600">
          投稿・分析・告知の担当AIを整理し、将来の自動化処理の土台をここで管理します。
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <form className="rounded-2xl border border-gray-200 bg-gray-50 p-4" onSubmit={handleCreateAgent}>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            AIエージェント
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">名前</label>
              <input
                type="text"
                className="input mt-1"
                value={agentName}
                onChange={(event) => setAgentName(event.target.value)}
                placeholder="例: 週報サポート"
                disabled={savingAgent}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">役割</label>
              <select
                className="input mt-1"
                value={agentRole}
                onChange={(event) =>
                  setAgentRole(event.target.value as PostingAiAgent["role"])
                }
                disabled={savingAgent}
              >
                <option value="POSTER">投稿担当</option>
                <option value="ANALYST">分析担当</option>
                <option value="PROMOTER">告知担当</option>
                <option value="REPLY_AGENT">返信担当</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="submit" className="btn" disabled={savingAgent || !props.address}>
              {savingAgent ? "追加中..." : "agent を追加"}
            </button>
          </div>
        </form>

        <form className="rounded-2xl border border-gray-200 bg-gray-50 p-4" onSubmit={handleQueueJob}>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Test Queue
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700">job 種別</label>
              <select
                className="input mt-1"
                value={jobType}
                onChange={(event) =>
                  setJobType(event.target.value as PostingAiJob["jobType"])
                }
                disabled={savingJob}
              >
                <option value="ANALYZE">分析</option>
                <option value="PROMOTE">告知</option>
                <option value="AUTO_POST">自動投稿</option>
                <option value="AUTO_REPLY">自動返信</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">
                担当 agent
              </label>
              <select
                className="input mt-1"
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
                disabled={savingJob}
              >
                <option value="">未指定</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} / {getRoleLabel(agent.role)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-[11px] leading-5 text-gray-500">
              実行や課金の本処理は後続フェーズです。ここでは queue 登録までを扱います。
            </div>
            <button type="submit" className="btn" disabled={savingJob || !props.address}>
              {savingJob ? "登録中..." : "job を追加"}
            </button>
          </div>
        </form>

        {feedback ? (
          <WorkspaceStatusNotice
            tone={feedback.tone}
            title={feedback.title}
            description={feedback.description}
          />
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">AI agent と job を読み込み中です...</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                登録済み agent
              </div>
              {agents.length === 0 ? (
                <WorkspaceEmptyState
                  compact
                  title="agent はまだありません"
                  description="まずは分析担当か投稿担当を 1 つ作ると運用を整理しやすくなります。"
                />
              ) : (
                agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="rounded-2xl border border-gray-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {agent.name}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {getRoleLabel(agent.role)} / {agent.status}
                        </div>
                      </div>
                      <div className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700">
                        job {agent.counts.jobs}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-500">
                      <span>投稿 {agent.counts.posts}</span>
                      <span>返信 {agent.counts.replies}</span>
                      <span>更新 {formatDateTime(agent.updatedAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                最近の job
              </div>
              {jobs.length === 0 ? (
                <WorkspaceEmptyState
                  compact
                  title="job はまだありません"
                  description="まずは分析 job を 1 件 queue に入れて、AIアシスタントの土台を試せます。"
                />
              ) : (
                jobs.slice(0, 6).map((job) => (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-gray-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {getJobTypeLabel(job.jobType)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {job.status}
                          {job.aiAgent ? ` / ${job.aiAgent.name}` : ""}
                        </div>
                      </div>
                      <div className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700">
                        {job.billingStatus}
                      </div>
                    </div>
                    {job.post ? (
                      <div className="mt-2 text-xs leading-5 text-gray-600">
                        対象投稿: {job.post.preview}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-500">
                      <span>{formatDateTime(job.createdAt)}</span>
                      <span>
                        コスト {job.executionCostUsd ? `${job.executionCostUsd} USD` : "-"}
                      </span>
                      <span>{job.billable ? "billable" : "non-billable"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
