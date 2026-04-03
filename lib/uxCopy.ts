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

export const AI_OFFICE_LABEL = "AIアシスタント";
export const POSTING_AI_OFFICE_LABEL = "投稿・AIアシスタント";

const TASK_TYPE_COPY: Record<TaskType, Copy> = {
  MANAGER_NEXT_ACTIONS: {
    label: "Manager Agent の次アクションを整理する",
    helper:
      "現在の project summary を見て、達成・plan・bridge 前後の次アクションを整理します。",
  },
  DISTRIBUTION_PLAN_DRAFT: {
    label: "配分 plan 下書きを作る",
    helper:
      "現在の project / settlement 状態をもとに、Draft step へ渡せる配分 JSON を整理します。",
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
  PROFILE_UPDATE_PROPOSAL: {
    label: "プロフィール改善案を確認する",
    helper:
      "現在のプロフィール情報を見て、公開ページをより伝わりやすくするための改善提案を整理します。",
  },
  DAILY_ACTION_PLAN: {
    label: "今日の行動計画を作る",
    helper:
      "承認待ち・投稿状況・目標進捗などを見て、今日優先すべき行動を整理します。",
  },
  ACTIVITY_RESTART_PROPOSAL: {
    label: "再起動プランを作る",
    helper:
      "活動が止まりかけたとき、過去の成功パターンをもとに再始動のための小さなステップを提案します。",
  },
  SUPPORT_STORY_DRAFT: {
    label: "支援ストーリーを作る",
    helper:
      "なぜ支援が必要で、何が実現し、どう前進するかを伝わる文章にまとめます。",
  },
  SUPPORTER_RESULT_REPORT: {
    label: "支援結果レポートを作る",
    helper:
      "支援がどの用途に活用され、活動がどう変わったかをファンに伝えるレポートを生成します。",
  },
  CAREER_PLAN_DRAFT: {
    label: "活動戦略を立てる",
    helper:
      "過去90日の投稿・支援・指標をもとに、3ヶ月・6ヶ月の成長マイルストーンを整理します。",
  },
  GROWTH_OPPORTUNITY_ALERT: {
    label: "成長機会を見つける",
    helper:
      "直近7日の指標データから、今すぐ動ける成長チャンスを優先度付きで提示します。",
  },
  MEETING_AGENDA_DRAFT: {
    label: "会議アジェンダを作る",
    helper:
      "直近のノート・会議履歴をもとに、次の会議の事前アジェンダ・確認事項・決定すべき事項を整理します。",
  },
  CONTACT_OUTREACH_DRAFT: {
    label: "対外連絡文を作る",
    helper:
      "会場・スポンサー・メディア・企業などへの初回連絡・営業文面を、連絡目的・接点履歴をもとに下書きします。",
  },
  STAGE_GROWTH_PLAN: {
    label: "ステージ成長プランを確認する",
    helper:
      "現在のCreatorステージと4軸成熟度スコアをもとに、次のレベルへ向けた具体的な成長ステップを提案します。",
  },
  CONTACT_INTELLIGENCE_ALERT: {
    label: "接点リスクを分析する",
    helper:
      "Contact Pipeline の停滞・期限超過・温度感などを分析し、優先対応が必要な接点をリスト化します。",
  },
  MONTHLY_CASHFLOW_REPORT: {
    label: "月次収支レポートを作る",
    helper:
      "今月の収入・支出を収入源・カテゴリ別に集計し、収支サマリーと次のアクションへのアドバイスを生成します。",
  },
  STAGE_PROGRESS_REPORT: {
    label: "ステージ診断レポートを確認する",
    helper:
      "現在の成長ステージと8軸成熟度スコアを診断し、強い軸・伸ばすべき軸のギャップと次に取り組むべきアクションを整理します。",
  },
  CONTRACT_RENEWAL_ALERT: {
    label: "契約更新アラートを確認する",
    helper:
      "Contact Pipeline に登録された接点の契約開始日・ステータスをもとに、更新対応が必要な接点を優先度付きで整理します。",
  },
  MEETING_FOLLOWUP_DRAFT: {
    label: "会議フォローアップを作成する",
    helper:
      "完了した会議の議事メモをもとに、アクション項目・決定事項・次回議題・参加者共有用サマリーを構造化して整理します。",
  },
  OPPORTUNITY_APPLICATION_DRAFT: {
    label: "案件応募文を下書きする",
    helper:
      "実績・ステージエビデンス・活動概要をもとに、コラボ・仕事・出演依頼への応募・問い合わせ文を生成します。",
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
  TASK_POSTING_COMPOSE_OPENED: "posting compose を開く",
  TASK_SETTLEMENT_DRAFT_APPLIED: "settlement draft に反映",
  TASK_OUTPUT_COPIED: "結果をコピー",
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
  AI_OFFICE_DASHBOARD_FAILED:
    {
      tone: "error",
      title: "AIの提案状況を取得できませんでした。",
      description: "少し待ってから再読み込みしてください。",
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
  TRANSLATION_INPUT_REQUIRED: {
    tone: "info",
    title: "翻訳するテキストを入力してください。",
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
  AI_MANAGER_BILLING_PAUSED: {
    tone: "info",
    title: "AIマネージャーの billable 利用は一時停止中です。",
    description: "Settings の pause reason を確認してから再度お試しください。",
  },
  AI_MANAGER_CAPABILITY_DISABLED: {
    tone: "info",
    title: "この種類の AI 作業は現在許可されていません。",
    description: "AIマネージャー設定で capability の許可範囲をご確認ください。",
  },
  AI_MANAGER_AUTO_PAY_DISABLED: {
    tone: "info",
    title: "自動支払いが無効のため実行できません。",
    description: "無料範囲以外を使う場合は auto-pay を有効にしてください。",
  },
  AI_MANAGER_BUDGET_REQUIRED: {
    tone: "info",
    title: "AI予算残高が不足しています。",
    description: "無料範囲は継続します。billable task を使うには JPYC 予算が必要です。",
  },
  AI_MANAGER_ACTION_CAP_EXCEEDED: {
    tone: "info",
    title: "1回あたりの上限を超えるため実行できません。",
    description: "per action cap を見直すか、軽い task を利用してください。",
  },
  AI_MANAGER_DAILY_CAP_EXCEEDED: {
    tone: "info",
    title: "今日の AI 利用上限に達しました。",
    description: "daily cap の範囲内で翌日以降に再度お試しください。",
  },
  AI_MANAGER_MONTHLY_CAP_EXCEEDED: {
    tone: "info",
    title: "今月の AI 利用上限に達しました。",
    description: "monthly cap の範囲内で翌月または設定変更後に再度お試しください。",
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
  TASK_SELECTION_REQUIRED: {
    tone: "info",
    title: "処理する提案を選択してください。",
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
  BALANCE_CHECK_OK:
    "送信前の確認が完了しました。",
  SETTLEMENT_STATUS_RECOMPUTED:
    "精算ステータスを再計算しました。",
  DISTRIBUTION_DRAFT_SAVED:
    "配分下書きを保存しました。",
  DISTRIBUTION_EXECUTION_STARTED:
    "配分実行を開始しました。",
  DISTRIBUTION_RESULT_MARKED_SENT:
    "送信済みに更新しました。",
  DISTRIBUTION_RESULT_MARKED_FAILED:
    "失敗として更新しました。",
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
  if (message === "BALANCE_CHECK_OK") {
    return {
      tone: "success",
      title: "送信前の確認が完了しました。",
      description:
        "この段階ではまだ送金されません。内容を確認できたら次の手順で配分を実行できます。",
    };
  }
  if (message === "SETTLEMENT_STATUS_RECOMPUTED") {
    return {
      tone: "success",
      title: "精算ステータスを再計算しました。",
      description:
        "ブリッジ・配分・実行結果の最新状態を反映しました。",
    };
  }
  if (message === "DISTRIBUTION_DRAFT_SAVED") {
    return {
      tone: "success",
      title: "配分下書きを保存しました。",
      description:
        "次は送信前確認を実行して、残高と設定不足を確認できます。",
    };
  }
  if (message === "DISTRIBUTION_EXECUTION_STARTED") {
    return {
      tone: "info",
      title: "配分実行を開始しました。",
      description:
        "ここから先は接続ウォレットで1件ずつ署名が必要です。内容を確認しながら進めてください。",
    };
  }
  if (message === "DISTRIBUTION_RESULT_MARKED_SENT") {
    return {
      tone: "success",
      title: "送信済みに更新しました。",
      description:
        "Review step の実行ログと結果確認に反映されます。",
    };
  }
  if (message === "DISTRIBUTION_RESULT_MARKED_FAILED") {
    return {
      tone: "info",
      title: "失敗として更新しました。",
      description:
        "Review step で失敗理由を確認し、必要なら再送や手動記録を続けてください。",
    };
  }
  const resolved = getSettlementMessage(message);
  if (!resolved) return null;
  if (resolved.startsWith("Distribute開始")) {
    return {
      tone: "info",
      title: resolved,
      description:
        "ここから先は接続ウォレットで1件ずつ送金します。署名ごとに内容を確認してください。",
    };
  }
  if (resolved.startsWith("Distribute一部完了")) {
    return {
      tone: "info",
      title: resolved,
      description:
        "Review step で実行ログと失敗行を確認し、必要な再送だけ進めてください。",
    };
  }
  if (resolved.startsWith("Distribute完了")) {
    return {
      tone: "success",
      title: resolved,
      description:
        "Review step で実行ログを確認し、記録漏れがないことを確かめて締めます。",
    };
  }
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
  const icttConfigMatch = message.match(/^ICTT_CONFIG_NOT_READY(?::\s*(.+))?$/);
  if (icttConfigMatch) {
    return icttConfigMatch[1]
      ? `ブリッジ設定がまだ揃っていません（不足: ${icttConfigMatch[1]}）。`
      : "ブリッジ設定がまだ揃っていません。";
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
