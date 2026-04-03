"use client";

import React from "react";

import { ProjectSettlementAdvancedSection } from "@/components/mypage/ProjectSettlementAdvancedSection";
import {
  DISTRIBUTION_PLAN_DRAFT_HANDOFF_STORAGE_KEY,
  parseDistributionPlanDraftHandoff,
} from "@/components/mypage/distributionPlanDraftHandoff";
import {
  ProjectSettlementGuidedFlowOverview,
  ProjectSettlementStepSection,
  type SettlementFlowStep,
} from "@/components/mypage/ProjectSettlementGuidedFlow";
import {
  WorkspaceEmptyState,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { ProjectSettlementBridgeSection } from "@/components/mypage/ProjectSettlementBridgeSection";
import { ProjectSettlementCctpSection } from "@/components/mypage/ProjectSettlementCctpSection";
import { ProjectSettlementDistributionDraftSection } from "@/components/mypage/ProjectSettlementDistributionDraftSection";
import { ProjectSettlementDistributionExecutionSection } from "@/components/mypage/ProjectSettlementDistributionExecutionSection";
import { ProjectSettlementExecutionLogsSection } from "@/components/mypage/ProjectSettlementExecutionLogsSection";
import { ProjectSettlementManualResultSection } from "@/components/mypage/ProjectSettlementManualResultSection";
import { ProjectSettlementPreflightSection } from "@/components/mypage/ProjectSettlementPreflightSection";
import { useProjectSettlementBridgeSectionProps } from "@/components/mypage/useProjectSettlementBridgeSectionProps";
import { useProjectSettlementDistributionSectionProps } from "@/components/mypage/useProjectSettlementDistributionSectionProps";
import { useProjectSettlementExecutionSectionProps } from "@/components/mypage/useProjectSettlementExecutionSectionProps";
import { useProjectSettlementPanel } from "@/components/mypage/useProjectSettlementPanel";
import {
  buildDistributionPlanDraftPayload,
  formatDistributionPlanDraftPayload,
  parseDistributionPlanDraftText,
} from "@/lib/creator-ai/distributionPlanDraft";
import { AGENT_TASK_AUDIT_ACTION } from "@/lib/agentTaskAudit";
import { recordAgentTaskFollowThrough } from "@/lib/agentTaskFollowThroughClient";
import type {
  CurrencyCode,
  SummaryViewData,
} from "@/lib/mypage/accountPageTypes";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";
import {
  getSettlementMessageState,
  getSettlementStatusCopy,
} from "@/lib/uxCopy";

function statusBadgeClass(
  status: ProjectSettlementData["settlement"]["status"] | "NOT_READY"
): string {
  if (status === "READY_FOR_DISTRIBUTION") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (status === "DISTRIBUTED") {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (status === "BRIDGING") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

type SettlementFlowStepId =
  | "BRIDGE"
  | "DRAFT"
  | "PREFLIGHT"
  | "EXECUTE"
  | "REVIEW";

function getCurrentSettlementStep(params: {
  settlementStatus: ProjectSettlementData["settlement"]["status"] | "NOT_READY";
  draftCompleted: boolean;
  preflightCompleted: boolean;
  executionCompleted: boolean;
}): SettlementFlowStepId {
  if (
    params.settlementStatus === "NOT_READY" ||
    params.settlementStatus === "BRIDGING"
  ) {
    return "BRIDGE";
  }
  if (!params.draftCompleted) return "DRAFT";
  if (!params.preflightCompleted) return "PREFLIGHT";
  if (!params.executionCompleted) return "EXECUTE";
  return "REVIEW";
}

type Props = {
  projectId: string | null;
  walletAddress: string | null;
  isConnected: boolean;
  projectCurrency?: CurrencyCode;
  initialData?: ProjectSettlementData | null;
  summary?: SummaryViewData | null;
};

export function ProjectSettlementPanel(props: Props) {
  const {
    projectId,
    walletAddress,
    isConnected,
    projectCurrency = "JPYC",
    initialData = null,
    summary = null,
  } = props;
  const currencyKey = projectCurrency.toLowerCase();
  const bridgeAnchorId = `settlement-bridge-${currencyKey}`;
  const planAnchorId = `settlement-plan-${currencyKey}`;
  const distributionResultAnchorId =
    `settlement-distribution-result-${currencyKey}`;
  const emptyStatusCopy = getSettlementStatusCopy("NOT_READY");

  const panel = useProjectSettlementPanel({
    projectId,
    walletAddress,
    isConnected,
    projectCurrency,
    initialData,
  });
  const bridgeSectionProps = useProjectSettlementBridgeSectionProps({
    panel,
    walletAddress,
  });
  const distributionSectionProps = useProjectSettlementDistributionSectionProps({
    panel,
    walletAddress,
  });
  const executionSectionProps = useProjectSettlementExecutionSectionProps({
    panel,
    walletAddress,
    isConnected,
    projectCurrency,
  });
  const bridgeRef = React.useRef<HTMLDivElement | null>(null);
  const draftRef = React.useRef<HTMLDivElement | null>(null);
  const preflightRef = React.useRef<HTMLDivElement | null>(null);
  const executeRef = React.useRef<HTMLDivElement | null>(null);
  const reviewRef = React.useRef<HTMLDivElement | null>(null);
  const [aiDraftMessage, setAiDraftMessage] = React.useState<{
    tone: "info" | "success" | "error";
    text: string;
  } | null>(null);
  const handoffAppliedRef = React.useRef(false);

  const settlementStatusCopy = getSettlementStatusCopy(
    panel.settlement?.status ?? "NOT_READY"
  );
  const settlementStatus = panel.settlement?.status ?? "NOT_READY";
  const visibleMessage = getSettlementMessageState(panel.message);
  const visibleWalletNotice = getSettlementMessageState(panel.walletNotice);

  const bridgeCompleted =
    settlementStatus === "READY_FOR_DISTRIBUTION" ||
    settlementStatus === "DISTRIBUTED";
  const draftCompleted = panel.entries.length > 0 && !panel.draftDirty;
  const preflightCompleted =
    panel.preflight.length > 0 && !panel.hasPreflightFailure;
  const executionCompleted =
    panel.recentExecutions.length > 0 || settlementStatus === "DISTRIBUTED";
  const currentStep = getCurrentSettlementStep({
    settlementStatus,
    draftCompleted,
    preflightCompleted,
    executionCompleted,
  });

  const canGenerateAiDraft = summary !== null;
  const draftPayload = React.useMemo(() => {
    if (!summary) {
      return null;
    }

    return buildDistributionPlanDraftPayload({
      project: {
        id: summary.project.id,
        title: summary.project.title,
        status: summary.project.status,
        currency: summary.project.currency ?? projectCurrency,
      },
      goal: summary.goal,
      progress: {
        progressPct: summary.progress.progressPct,
      },
      distributionPlan: summary.distributionPlan,
      settlement: {
        status: panel.settlement?.status ?? null,
        bridgedTotalAtomic: panel.settlement?.bridgedTotalAtomic ?? null,
      },
      distributionEntries: panel.entries.map((entry) => ({
        id: entry.id,
        recipientAddressChecksum: entry.recipientAddressChecksum,
        amountAtomic: entry.amountAtomic,
        memo: entry.memo,
        status: entry.status,
        token: entry.token,
      })),
    });
  }, [panel.entries, panel.settlement, projectCurrency, summary]);

  const generateAiDraft = React.useCallback(() => {
    if (!draftPayload) {
      setAiDraftMessage({
        tone: "error",
        text: "Summary を取得すると AI 下書きを作れます。",
      });
      return;
    }

    const parsed = parseDistributionPlanDraftText(
      formatDistributionPlanDraftPayload(draftPayload),
      projectCurrency
    );
    if (!parsed.ok) {
      setAiDraftMessage({
        tone: "error",
        text: "AIの提案から配分行を読み込めませんでした。内容を確認してください。",
      });
      return;
    }

    panel.replaceDraftRows(parsed.rows);
    setAiDraftMessage({
      tone: "success",
      text: "AIの提案を配分計画へ適用しました。保存前に内容を確認してください。",
    });
  }, [draftPayload, panel, projectCurrency]);

  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      !projectId ||
      handoffAppliedRef.current
    ) {
      return;
    }

    const raw = window.localStorage.getItem(
      DISTRIBUTION_PLAN_DRAFT_HANDOFF_STORAGE_KEY
    );
    if (!raw) {
      return;
    }

    let parsedValue: unknown = null;
    try {
      parsedValue = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(
        DISTRIBUTION_PLAN_DRAFT_HANDOFF_STORAGE_KEY
      );
      return;
    }

    const handoff = parseDistributionPlanDraftHandoff(parsedValue);
    if (!handoff) {
      window.localStorage.removeItem(
        DISTRIBUTION_PLAN_DRAFT_HANDOFF_STORAGE_KEY
      );
      return;
    }

    if (handoff.projectId !== projectId || handoff.currency !== projectCurrency) {
      return;
    }

    const parsed = parseDistributionPlanDraftText(handoff.payloadText, projectCurrency);
    handoffAppliedRef.current = true;
    window.localStorage.removeItem(DISTRIBUTION_PLAN_DRAFT_HANDOFF_STORAGE_KEY);

    if (!parsed.ok) {
      setAiDraftMessage({
        tone: "error",
        text: "AIからの配分提案を読み込めませんでした。内容を確認してください。",
      });
      return;
    }

    panel.replaceDraftRows(parsed.rows);
    setAiDraftMessage({
      tone: "info",
      text: "AIから配分計画の提案を受け取りました。保存前に内容を確認してください。",
    });
    if (handoff.sourceTaskId) {
      recordAgentTaskFollowThrough({
        address: walletAddress,
        taskId: handoff.sourceTaskId,
        action: AGENT_TASK_AUDIT_ACTION.SETTLEMENT_DRAFT_APPLIED,
      });
    }
  }, [panel, projectCurrency, projectId, walletAddress]);

  const stepRefs = React.useMemo<
    Record<SettlementFlowStepId, React.RefObject<HTMLDivElement | null>>
  >(
    () => ({
      BRIDGE: bridgeRef,
      DRAFT: draftRef,
      PREFLIGHT: preflightRef,
      EXECUTE: executeRef,
      REVIEW: reviewRef,
    }),
    []
  );

  const steps: SettlementFlowStep[] = [
    {
      id: "BRIDGE",
      stepNumber: 1,
      title: "送金準備",
      helper:
        settlementStatus === "NOT_READY"
          ? "目標達成後に、必要な資金移動とブリッジ記録をここから始めます。"
          : "必要な資金移動を確認し、Avalanche で配分できる状態へ近づけます。",
      status:
        settlementStatus === "NOT_READY"
          ? "blocked"
          : bridgeCompleted
            ? "complete"
            : currentStep === "BRIDGE"
              ? "current"
              : "upcoming",
    },
    {
      id: "DRAFT",
      stepNumber: 2,
      title: "配分計画",
      helper: "送金先と金額を下書きして保存します。この段階ではまだ送金されません。",
      status: draftCompleted
        ? "complete"
        : currentStep === "DRAFT"
          ? "current"
          : "upcoming",
    },
    {
      id: "PREFLIGHT",
      stepNumber: 3,
      title: "送信前確認",
      helper: "送信前に残高と設定不足を確認します。この段階ではまだ送金されません。",
      status: preflightCompleted
        ? "complete"
        : currentStep === "PREFLIGHT"
          ? "current"
          : "upcoming",
    },
    {
      id: "EXECUTE",
      stepNumber: 4,
      title: "配分実行",
      helper: "ここから先は接続ウォレットの署名で実際の配分を実行します。",
      status: executionCompleted
        ? "complete"
        : currentStep === "EXECUTE"
          ? "current"
          : "upcoming",
    },
    {
      id: "REVIEW",
      stepNumber: 5,
      title: "結果確認",
      helper: "通常は実行ログを確認し、例外的な手動記録は必要なときだけ開きます。",
      status: currentStep === "REVIEW" ? "current" : "upcoming",
    },
  ];

  const currentStepMessage: Record<
    SettlementFlowStepId,
    { tone: "attention" | "info"; title: string; description: string }
  > = {
    BRIDGE:
      settlementStatus === "NOT_READY"
        ? {
            tone: "info",
            title: "精算フローはまだ開始前です",
            description:
              "現在は目標達成前のため、精算は待機中です。達成後に手順1の送金準備から進めます。",
          }
        : {
            tone: "attention",
            title: "手順1. 送金準備を進めます",
            description:
              "実際のブリッジ送信か、すでに実行済みの完了記録をここで扱います。内容を確認しながら配分準備へ進みます。",
          },
    DRAFT: {
      tone: "attention",
      title: "手順2. 配分計画を整えます",
      description:
        "ここでは送金先と金額を保存するだけで、まだ資金移動は起きません。保存後に送信前確認へ進みます。",
    },
    PREFLIGHT: {
      tone: "attention",
      title: "手順3. 送信前確認を実行します",
      description:
        "この手順では送金せず、残高と設定不足だけを確認します。問題がなければ次の配分実行へ進みます。",
    },
    EXECUTE: {
      tone: "attention",
      title: "手順4. 配分を実行します",
      description:
        "ここから先は接続ウォレットの署名で実際の送金を行います。各行の宛先と金額を最終確認して進めます。",
    },
    REVIEW: {
      tone: "info",
      title: "手順5. 実行結果を確認します",
      description:
        "通常は実行ログの確認で十分です。手動結果の記録や高度な管理は必要な場合だけ進めます。",
    },
  };

  const scrollToStep = React.useCallback((stepId: string) => {
    const ref = stepRefs[stepId as SettlementFlowStepId];
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [stepRefs]);

  React.useEffect(() => {
    if (!panel.canUse) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      return;
    }

    if (hash === bridgeAnchorId) {
      scrollToStep("BRIDGE");
      return;
    }

    if (hash === planAnchorId) {
      scrollToStep("DRAFT");
      return;
    }

    if (hash === distributionResultAnchorId) {
      scrollToStep("REVIEW");
    }
  }, [
    bridgeAnchorId,
    distributionResultAnchorId,
    panel.canUse,
    planAnchorId,
    scrollToStep,
  ]);

  if (!panel.canUse) {
    return (
      <WorkspaceEmptyState
        title="プロジェクトを作成すると精算設定が始まります"
        description="目標達成後の送金・配分準備は、プロジェクトを作成してからこの画面で進めます。"
      />
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">
            精算と配分の進行 [{projectCurrency}]
          </div>
          <div className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs">
            本UIは資金を保管しません。送金・ブリッジは必ずユーザー自身のウォレットで実行されます。
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span
            className={`w-fit rounded border px-2 py-1 text-xs ${statusBadgeClass(
              panel.settlement?.status ?? "NOT_READY"
            )}`}
          >
            {settlementStatusCopy.label}
          </span>
          <button
            type="button"
            className="w-full rounded border px-3 py-2 text-sm sm:w-auto sm:py-1.5 sm:text-xs"
            onClick={() => void panel.recompute()}
            disabled={panel.loading}
          >
            状態を更新
          </button>
        </div>
      </div>

      <div className="-mt-1 text-[11px] leading-5 text-gray-500 sm:-mt-2 sm:text-xs">
        {panel.settlement ? settlementStatusCopy.helper : emptyStatusCopy.helper}
      </div>

      <WorkspaceStatusNotice
        tone="info"
        title="精算は上から順に確認して進めます。"
        description="Bridge → Draft → Preflight → Execute → Review の順に進めると、実際の資金移動に入る前の確認を飛ばしにくくなります。"
      />

      {visibleWalletNotice ? (
        <WorkspaceStatusNotice
          tone={panel.walletNotice ? "attention" : visibleWalletNotice.tone}
          title={visibleWalletNotice.title}
          description={visibleWalletNotice.description}
        />
      ) : null}

      {visibleMessage ? (
        <WorkspaceStatusNotice
          tone={visibleMessage.tone}
          title={visibleMessage.title}
          description={visibleMessage.description}
        />
      ) : null}

      <ProjectSettlementGuidedFlowOverview
        steps={steps}
        onOpenStep={scrollToStep}
      />

      <WorkspaceStatusNotice
        tone={currentStepMessage[currentStep].tone}
        title={currentStepMessage[currentStep].title}
        description={currentStepMessage[currentStep].description}
      >
        <button
          type="button"
          className="w-full rounded-full border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 disabled:opacity-40 sm:w-auto sm:py-1.5 sm:text-xs"
          onClick={() => scrollToStep(currentStep)}
          disabled={panel.loading}
        >
          現在の手順を開く
        </button>
      </WorkspaceStatusNotice>

      <div
        ref={bridgeRef}
        id={bridgeAnchorId}
        className="scroll-mt-24"
      >
        <ProjectSettlementStepSection
          stepNumber={1}
          title="送金準備"
          helper={steps[0].helper}
          status={steps[0].status}
        >
          <div className="space-y-4">
            <ProjectSettlementBridgeSection {...bridgeSectionProps} />
            {executionSectionProps.cctp ? (
              <ProjectSettlementAdvancedSection
                title="USDC ブリッジの高度な管理"
                description="CCTP の手動同期や再試行は、通常フローで足りないときだけ開きます。外部で Burn / Mint 結果を確認できた場合だけ記録を進めます。"
              >
                <ProjectSettlementCctpSection {...executionSectionProps.cctp} />
              </ProjectSettlementAdvancedSection>
            ) : null}
          </div>
        </ProjectSettlementStepSection>
      </div>

      <div
        ref={draftRef}
        id={planAnchorId}
        className="scroll-mt-24"
      >
        <ProjectSettlementStepSection
          stepNumber={2}
          title="配分計画"
          helper={steps[1].helper}
          status={steps[1].status}
        >
          <ProjectSettlementDistributionDraftSection
            {...distributionSectionProps.distributionDraft}
            aiDraftMessage={aiDraftMessage}
            canGenerateAiDraft={canGenerateAiDraft}
            generateAiDraft={generateAiDraft}
          />
        </ProjectSettlementStepSection>
      </div>

      <div ref={preflightRef} className="scroll-mt-24">
        <ProjectSettlementStepSection
          stepNumber={3}
          title="送信前確認"
          helper={steps[2].helper}
          status={steps[2].status}
        >
          <ProjectSettlementPreflightSection
            {...executionSectionProps.preflight}
          />
        </ProjectSettlementStepSection>
      </div>

      <div ref={executeRef} className="scroll-mt-24">
        <ProjectSettlementStepSection
          stepNumber={4}
          title="配分実行"
          helper={steps[3].helper}
          status={steps[3].status}
        >
          <ProjectSettlementDistributionExecutionSection
            {...executionSectionProps.distributionExecution}
          />
        </ProjectSettlementStepSection>
      </div>

      <div
        ref={reviewRef}
        id={distributionResultAnchorId}
        className="scroll-mt-24"
      >
        <ProjectSettlementStepSection
          stepNumber={5}
          title="結果確認"
          helper={steps[4].helper}
          status={steps[4].status}
        >
          <div className="space-y-4">
            <WorkspaceStatusNotice
              tone="info"
              title="通常の確認は実行ログまでで十分です"
              description="まず実行ログで結果と txHash を確認し、反映しきれない行だけ手動記録を使います。"
            />
            <ProjectSettlementExecutionLogsSection
              {...executionSectionProps.executionLogs}
            />
            <ProjectSettlementAdvancedSection
              title="送信結果の手動記録"
              description="自動で反映できない結果を、外部で確認できたときだけ補完します。通常は実行ログの確認だけで十分です。"
            >
              <ProjectSettlementManualResultSection
                {...executionSectionProps.manualResult}
              />
            </ProjectSettlementAdvancedSection>
          </div>
        </ProjectSettlementStepSection>
      </div>
    </div>
  );
}
