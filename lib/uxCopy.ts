import type { TaskStatus, TaskType } from "@/lib/agentTaskParsers";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";

type Copy = {
  label: string;
  helper?: string;
};

type MessageState = {
  tone: "success" | "error" | "info";
  title: string;
  description?: string;
};

const TASK_TYPE_COPY: Record<TaskType, Copy> = {
  MANAGER_NEXT_ACTIONS: {
    label: "Manager Agent の次アクションを整理する",
    helper:
      "現在の project summary を見て、達成・plan・bridge 前後の次アクションを整理します。",
  },
  ANALYZE: {
    label: "活動を分析する",
    helper: "最近の指標を見て、動きや改善点を整理します。",
  },
  PROPOSE: {
    label: "次の施策案を作る",
    helper: "project と最近の指標をもとに、次の打ち手を提案します。",
  },
  TRANSLATE: {
    label: "翻訳案を作る",
    helper: "下書きや投稿文を指定した言語向けに言い換えます。",
  },
  WEEKLY_REPORT: {
    label: "週次レポート案を作る",
    helper: "一定期間の活動と支援状況をまとめた共有文を作ります。",
  },
  ANNOUNCEMENT_DRAFT: {
    label: "告知文案を作る",
    helper: "最近の動きと支援状況を踏まえて、告知向けの文面を作ります。",
  },
  SUPPORTER_MESSAGE_DRAFT: {
    label: "支援者メッセージ案を作る",
    helper: "支援者向けのお礼や再案内の文面を作ります。",
  },
};

const TASK_STATUS_COPY: Record<TaskStatus, Copy> = {
  QUEUED: {
    label: "準備中",
    helper: "AI が処理を始める前の状態です。",
  },
  RUNNING: {
    label: "作成中",
    helper: "AI が内容を作成しています。",
  },
  WAITING_APPROVAL: {
    label: "承認待ち",
    helper: "内容を確認してから公開や次の処理に進めます。",
  },
  DONE: {
    label: "完了",
    helper: "内容の作成または承認が完了しています。",
  },
  FAILED: {
    label: "要確認",
    helper: "内容を見直すか、もう一度作り直してください。",
  },
};

const TASK_AUDIT_ACTION_COPY: Record<string, string> = {
  TASK_CREATED_DONE: "作成して完了",
  TASK_CREATED_WAITING_APPROVAL: "承認待ちで作成",
  TASK_APPROVED: "承認して完了",
  TASK_REJECTED: "却下",
};

const SOCIAL_CONNECTION_STATUS_COPY: Record<string, string> = {
  ACTIVE: "利用中",
  INACTIVE: "停止中",
  ERROR: "要確認",
};

const SETTLEMENT_STATUS_COPY: Record<
  ProjectSettlementData["settlement"]["status"] | "NOT_READY",
  Copy
> = {
  NOT_READY: {
    label: "準備中",
    helper: "目標達成やブリッジ前の段階です。",
  },
  BRIDGING: {
    label: "ブリッジ進行中",
    helper: "配分前に必要な移動や確認を進めています。",
  },
  READY_FOR_DISTRIBUTION: {
    label: "配分準備完了",
    helper: "残高と送信先を確認すれば配分を実行できます。",
  },
  DISTRIBUTED: {
    label: "配分完了",
    helper: "送信結果の記録まで完了しています。",
  },
};

const DISTRIBUTION_ENTRY_STATUS_COPY: Record<
  ProjectSettlementData["distributionEntries"][number]["status"],
  string
> = {
  DRAFT: "下書き",
  QUEUED: "送信待ち",
  SENT: "送信済み",
  FAILED: "失敗",
  CANCELLED: "対象外",
};

const EXECUTION_RESULT_COPY: Record<
  ProjectSettlementData["recentExecutions"][number]["result"],
  string
> = {
  SUCCESS: "成功",
  PARTIAL_SUCCESS: "一部成功",
  FAILED: "失敗",
};

const BRIDGE_STEP_STATUS_COPY: Record<
  ProjectSettlementData["bridgeSteps"][number]["status"],
  string
> = {
  PENDING: "未完了",
  COMPLETED: "記録済み",
  CANCELLED: "キャンセル",
};

const CCTP_STATUS_COPY: Record<
  ProjectSettlementData["cctpJobs"][number]["status"],
  string
> = {
  PENDING: "準備中",
  BURN_SUBMITTED: "Burn 記録済み",
  ATTESTATION_READY: "Attestation 取得済み",
  MINT_SUBMITTED: "Mint 記録済み",
  COMPLETED: "完了",
  FAILED: "失敗",
};

const AI_OFFICE_MESSAGE_COPY: Record<string, MessageState> = {
  SOCIAL_CONNECTION_CREATE_FAILED:
    {
      tone: "error",
      title: "SNS 連携を保存できませんでした。",
      description: "入力内容を確認して、もう一度お試しください。",
    },
  METRICS_COLLECT_FAILED:
    {
      tone: "error",
      title: "最新の指標を取得できませんでした。",
      description: "しばらく待ってから、もう一度お試しください。",
    },
  AGENT_TASK_CREATE_FAILED:
    {
      tone: "error",
      title: "AI タスクを作成できませんでした。",
      description: "入力内容を確認して、もう一度お試しください。",
    },
  AGENT_TASK_APPROVAL_FAILED:
    {
      tone: "error",
      title: "承認処理に失敗しました。",
      description: "画面を更新してから、もう一度お試しください。",
    },
  TRANSLATION_FAILED:
    {
      tone: "error",
      title: "翻訳案を取得できませんでした。",
      description: "しばらく待ってから、もう一度お試しください。",
    },
  TRANSLATION_RESPONSE_INVALID:
    {
      tone: "error",
      title: "翻訳結果を正しく受け取れませんでした。",
      description: "もう一度お試しください。",
    },
  TASK_INPUT_INVALID: {
    tone: "info",
    title: "入力内容を確認してください。",
    description: "必須項目が不足している可能性があります。",
  },
  TASK_TYPE_INVALID: {
    tone: "info",
    title: "作成する内容の種類が正しくありません。",
    description: "選び直してから、もう一度お試しください。",
  },
  TASK_ID_REQUIRED: {
    tone: "info",
    title: "承認対象を選択してください。",
  },
  TASK_IDS_INVALID: {
    tone: "info",
    title: "承認対象の選択内容を確認してください。",
  },
  TASK_ID_CONFLICT:
    {
      tone: "error",
      title: "承認対象の指定方法が重複しています。",
      description: "画面を更新してからやり直してください。",
    },
  TASK_IDS_TOO_MANY:
    {
      tone: "info",
      title: "一度に処理する件数が多すぎます。",
      description: "件数を減らして、もう一度お試しください。",
    },
  TASK_NOT_FOUND:
    {
      tone: "error",
      title: "対象の AI タスクが見つかりませんでした。",
      description: "画面を更新してからご確認ください。",
    },
  TASK_NOT_WAITING_APPROVAL:
    {
      tone: "info",
      title: "この AI タスクは承認待ちではありません。",
      description: "すでに処理済みの可能性があるため、一覧を更新してご確認ください。",
    },
};

const SETTLEMENT_MESSAGE_COPY: Record<string, string> = {
  ADDRESS_REQUIRED:
    "ウォレットアドレスが必要です。接続状態を確認してからもう一度お試しください。",
  WALLET_NOT_CONNECTED:
    "ウォレットが接続されていません。接続してからもう一度お試しください。",
  WALLET_CLIENT_NOT_READY:
    "ウォレットの準備がまだ完了していません。接続状態を確認してください。",
  WALLET_ACCOUNT_NOT_READY:
    "ウォレットのアカウント情報を取得できませんでした。接続状態を確認してください。",
  PUBLIC_CLIENT_NOT_READY:
    "ネットワーク接続の準備がまだ完了していません。少し待ってからもう一度お試しください。",
  BRIDGED_AMOUNT_INVALID:
    "ブリッジ済み金額の入力が正しくありません。0 より大きい数値を入力してください。",
  BRIDGE_AMOUNT_INVALID:
    "ブリッジ金額の入力が正しくありません。数値を見直してください。",
  TX_HASH_INVALID:
    "トランザクションハッシュの形式が正しくありません。",
  TX_HASH_REQUIRED_FOR_SENT:
    "送信済みに更新する場合はトランザクションハッシュが必要です。",
  BRIDGE_RECORD_FAILED:
    "ブリッジ結果を記録できませんでした。入力内容を確認してもう一度お試しください。",
  BRIDGE_PREPARE_SHAPE_MISMATCH:
    "ブリッジ実行に必要な情報を正しく受け取れませんでした。時間をおいて再度お試しください。",
  APPROVE_TX_FAILED:
    "承認トランザクションが完了しませんでした。ウォレットの状態をご確認ください。",
  BRIDGE_TX_FAILED:
    "ブリッジのトランザクション送信に失敗しました。ウォレットとネットワークをご確認ください。",
  BRIDGE_NOW_FAILED:
    "ブリッジ実行に失敗しました。ウォレットとネットワークを確認してからやり直してください。",
  RECIPIENT_ADDRESS_INVALID:
    "送金先アドレスの形式が正しくありません。各行の入力内容をご確認ください。",
  AMOUNT_INVALID:
    "金額の入力が正しくありません。0 より大きい数値を入力してください。",
  DISTRIBUTION_SAVE_FAILED:
    "配分下書きを保存できませんでした。入力内容を確認してもう一度お試しください。",
  SETTLEMENT_FETCH_FAILED:
    "精算データを読み込めませんでした。画面を更新してもう一度お試しください。",
  SETTLEMENT_RECOMPUTE_FAILED:
    "精算ステータスを更新できませんでした。しばらく待ってからもう一度お試しください。",
  BALANCE_CHECK_FAILED:
    "残高チェックに失敗しました。ウォレット接続とネットワーク状態をご確認ください。",
  PRECHECK_FAILED:
    "送信前チェックに失敗しました。入力内容とネットワーク状態をご確認ください。",
  INSUFFICIENT_TOKEN_BALANCE:
    "必要なトークン残高が不足しています。残高を確認してから配分を実行してください。",
  CCTP_ACTION_FAILED:
    "USDC ブリッジ状態の更新に失敗しました。時間をおいて再度お試しください。",
  DISTRIBUTION_RESULT_SAVE_FAILED:
    "送信結果を保存できませんでした。トランザクション情報を確認してもう一度お試しください。",
  CHAIN_NOT_AVALANCHE:
    "配分を実行する前に Avalanche C-Chain へ切り替えてください。",
  SETTLEMENT_NOT_READY_FOR_DISTRIBUTION:
    "まだ配分を実行できる状態ではありません。ブリッジや残高を先に確認してください。",
  SAVE_DISTRIBUTION_DRAFT_FIRST:
    "未保存の配分下書きがあります。先に保存してから配分を実行してください。",
  NO_BRIDGED_BALANCE:
    "配分に使える残高がまだありません。ブリッジ完了後にもう一度お試しください。",
  NO_DISTRIBUTION_TARGETS:
    "配分対象がありません。下書きを作成して保存してから実行してください。",
  SETTLEMENT_RESPONSE_INVALID:
    "精算データの形式を正しく受け取れませんでした。画面を更新してご確認ください。",
};

function looksLikeCode(input: string): boolean {
  return /^[A-Z0-9_]+$/.test(input);
}

export function getAgentTaskTypeCopy(taskType: string): Copy {
  return (
    TASK_TYPE_COPY[taskType as TaskType] ?? {
      label: taskType,
    }
  );
}

export function getAgentTaskStatusCopy(status: string): Copy {
  return (
    TASK_STATUS_COPY[status as TaskStatus] ?? {
      label: status,
    }
  );
}

export function getAgentTaskAuditActionLabel(action: string): string {
  return TASK_AUDIT_ACTION_COPY[action] ?? action;
}

export function getSocialConnectionStatusLabel(status: string): string {
  return SOCIAL_CONNECTION_STATUS_COPY[status] ?? status;
}

export function getSettlementStatusCopy(
  status: ProjectSettlementData["settlement"]["status"] | "NOT_READY"
): Copy {
  return SETTLEMENT_STATUS_COPY[status];
}

export function getBridgeStepStatusLabel(
  status: ProjectSettlementData["bridgeSteps"][number]["status"]
): string {
  return BRIDGE_STEP_STATUS_COPY[status];
}

export function getDistributionEntryStatusLabel(
  status: ProjectSettlementData["distributionEntries"][number]["status"]
): string {
  return DISTRIBUTION_ENTRY_STATUS_COPY[status];
}

export function getDistributionRuntimeStatusLabel(
  status: "QUEUED" | "SENT" | "FAILED"
): string {
  return (
    {
      QUEUED: "送信待ち",
      SENT: "送信済み",
      FAILED: "失敗",
    } as const
  )[status];
}

export function getDistributionExecutionResultLabel(
  status: ProjectSettlementData["recentExecutions"][number]["result"]
): string {
  return EXECUTION_RESULT_COPY[status];
}

export function getCctpStatusLabel(
  status: ProjectSettlementData["cctpJobs"][number]["status"]
): string {
  return CCTP_STATUS_COPY[status];
}

export function getAiOfficeMessageState(
  message: string | null
): MessageState | null {
  if (!message) return null;
  if (AI_OFFICE_MESSAGE_COPY[message]) {
    return AI_OFFICE_MESSAGE_COPY[message];
  }
  if (looksLikeCode(message)) {
    return {
      tone: "error",
      title: "支援者対応の処理に失敗しました。",
      description: "内容を確認して、もう一度お試しください。",
    };
  }
  if (/(入力してください|選択してください|確認してください|必要です)/.test(message)) {
    return {
      tone: "info",
      title: message,
    };
  }
  if (
    /(失敗しました|できませんでした|見つかりませんでした|正しく受け取れませんでした|正しくありません)/.test(
      message
    )
  ) {
    return {
      tone: "error",
      title: message,
    };
  }
  return {
    tone: "success",
    title: message,
  };
}

export function getAiOfficeMessage(message: string | null): string | null {
  return getAiOfficeMessageState(message)?.title ?? null;
}

export function getSettlementMessageState(
  message: string | null
): MessageState | null {
  const resolved = getSettlementMessage(message);
  if (!resolved) return null;
  if (/(更新しました|保存しました|記録しました|完了しました)/.test(resolved)) {
    return {
      tone: "success",
      title: resolved,
    };
  }
  if (
    /(必要です|確認してください|切り替えてください|まだ配分を実行できる状態ではありません|先に保存してから配分を実行してください)/.test(
      resolved
    )
  ) {
    return {
      tone: "info",
      title: resolved,
    };
  }
  return {
    tone: "error",
    title: resolved,
  };
}

export function getSettlementMessage(message: string | null): string | null {
  if (!message) return null;
  if (SETTLEMENT_MESSAGE_COPY[message]) {
    return SETTLEMENT_MESSAGE_COPY[message];
  }
  const tokenAddressMatch = message.match(/^TOKEN_ADDRESS_NOT_CONFIGURED_(JPYC|USDC)$/);
  if (tokenAddressMatch) {
    return `${tokenAddressMatch[1]} の送金トークン設定が不足しています。環境設定を確認してください。`;
  }
  if (message.startsWith("CCTP action: ")) {
    const action = message.replace("CCTP action: ", "");
    const actionLabel =
      {
        SYNC_FROM_GOAL: "Goal から同期",
        MARK_BURN_SUBMITTED: "Burn を記録",
        FETCH_ATTESTATION: "Attestation を取得",
        MARK_MINT_SUBMITTED: "Mint を記録",
        COMPLETE: "完了に更新",
        FAIL: "失敗に更新",
        RETRY: "再試行を開始",
      }[action] ?? action;
    return `USDC ブリッジ状態を更新しました（${actionLabel}）。`;
  }
  if (looksLikeCode(message)) {
    return "精算まわりの処理に失敗しました。入力内容とウォレット状態を確認してもう一度お試しください。";
  }
  return message;
}
