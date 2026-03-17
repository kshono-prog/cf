"use client";

import React from "react";

import { ProjectSettlementAdvancedSection } from "@/components/mypage/ProjectSettlementAdvancedSection";
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
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
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
};

export function ProjectSettlementPanel(props: Props) {
  const {
    projectId,
    walletAddress,
    isConnected,
    projectCurrency = "JPYC",
    initialData = null,
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
      title: "Bridge",
      helper:
        settlementStatus === "NOT_READY"
          ? "目標達成後に、必要な資金移動とブリッジ記録をここから始めます。"
          : "必要な資金移動を記録し、Avalanche で配分できる状態に近づけます。",
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
      title: "Draft",
      helper: "送金先と金額を下書きし、配分計画を固めます。",
      status: draftCompleted
        ? "complete"
        : currentStep === "DRAFT"
          ? "current"
          : "upcoming",
    },
    {
      id: "PREFLIGHT",
      stepNumber: 3,
      title: "Preflight",
      helper: "送信前に残高と設定不足を確認します。",
      status: preflightCompleted
        ? "complete"
        : currentStep === "PREFLIGHT"
          ? "current"
          : "upcoming",
    },
    {
      id: "EXECUTE",
      stepNumber: 4,
      title: "Execute",
      helper: "接続ウォレットの署名で配分を実行します。",
      status: executionCompleted
        ? "complete"
        : currentStep === "EXECUTE"
          ? "current"
          : "upcoming",
    },
    {
      id: "REVIEW",
      stepNumber: 5,
      title: "Review",
      helper: "実行結果、失敗分、履歴を確認して締めます。",
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
              "現在は目標達成前のため、精算は待機中です。達成後に Step 1 のブリッジ準備から進めます。",
          }
        : {
            tone: "attention",
            title: "Step 1. Bridge を進めます",
            description:
              "必要なチェーンから Avalanche への移動を記録し、配分準備へ進みます。",
          },
    DRAFT: {
      tone: "attention",
      title: "Step 2. 配分の下書きを整えます",
      description:
        "送金先と金額を保存してから、送信前チェックへ進みます。",
    },
    PREFLIGHT: {
      tone: "attention",
      title: "Step 3. 送信前チェックを実行します",
      description:
        "残高と設定不足を確認し、問題がなければ配分実行に進みます。",
    },
    EXECUTE: {
      tone: "attention",
      title: "Step 4. 配分を実行します",
      description:
        "送信前チェック完了後に、接続ウォレットの署名で配分を行います。",
    },
    REVIEW: {
      tone: "info",
      title: "Step 5. 実行結果を確認します",
      description:
        "送信結果、失敗分、履歴を確認して必要があれば再送や記録を行います。",
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
        title="project を作成すると精算設定が始まります"
        description="目標達成後のブリッジや配分準備は、project を作成してからこの画面で進めます。"
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
          現在の step を開く
        </button>
      </WorkspaceStatusNotice>

      <div
        ref={bridgeRef}
        id={bridgeAnchorId}
        className="scroll-mt-24"
      >
        <ProjectSettlementStepSection
          stepNumber={1}
          title="Bridge"
          helper={steps[0].helper}
          status={steps[0].status}
        >
          <div className="space-y-4">
            <ProjectSettlementBridgeSection {...bridgeSectionProps} />
            {executionSectionProps.cctp ? (
              <ProjectSettlementAdvancedSection
                title="USDC ブリッジの高度な管理"
                description="CCTP の手動同期や再試行は、通常フローで足りないときだけ開きます。"
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
          title="Draft"
          helper={steps[1].helper}
          status={steps[1].status}
        >
          <ProjectSettlementDistributionDraftSection
            {...distributionSectionProps.distributionDraft}
          />
        </ProjectSettlementStepSection>
      </div>

      <div ref={preflightRef} className="scroll-mt-24">
        <ProjectSettlementStepSection
          stepNumber={3}
          title="Preflight"
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
          title="Execute"
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
          title="Review"
          helper={steps[4].helper}
          status={steps[4].status}
        >
          <div className="space-y-4">
            <WorkspaceStatusNotice
              tone="info"
              title="通常の確認は実行ログまでで十分です"
              description="送信結果の手動記録や詳細な operator 操作は、必要な場合だけ Advanced を開いて使います。"
            />
            <ProjectSettlementExecutionLogsSection
              {...executionSectionProps.executionLogs}
            />
            <ProjectSettlementAdvancedSection
              title="送信結果の手動記録"
              description="自動で反映できない結果を補完したいときだけ使います。通常は実行ログの確認だけで十分です。"
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
