"use client";

export type WorkspaceActionNoticeTone =
  | "success"
  | "error"
  | "info"
  | "attention";

export type WorkspaceActionNotice = {
  tone: WorkspaceActionNoticeTone;
  title: string;
  description?: string;
};

const OWNER_AUTH_ERROR_CODES = new Set<string>([
  "OWNER_SIGNER_NOT_READY",
  "OWNER_AUTH_REQUIRED",
  "OWNER_AUTH_NONCE_FAILED",
  "OWNER_AUTH_NONCE_NOT_FOUND",
  "OWNER_AUTH_NONCE_EXPIRED",
  "OWNER_AUTH_MESSAGE_INVALID",
  "OWNER_AUTH_SIGNATURE_INVALID",
  "OWNER_AUTH_SESSION_FAILED",
  "OWNER_AUTH_SESSION_STATUS_FAILED",
]);

function looksLikeCode(value: string): boolean {
  return /^[A-Z0-9_]+$/.test(value.trim());
}

export function mapWorkspaceActionError(
  message: string,
  fallbackTitle: string
): WorkspaceActionNotice {
  const trimmedMessage = message.trim();
  const normalizedMessage = trimmedMessage.toUpperCase();
  const lowerMessage = trimmedMessage.toLowerCase();

  switch (normalizedMessage) {
    case "ADDRESS_REQUIRED":
    case "WALLET_NOT_CONNECTED":
      return {
        tone: "attention",
        title: "続けるにはウォレット接続を確認してください。",
        description:
          "接続済みのウォレットを確認してから、もう一度お試しください。",
      };
    case "USER_INPUT_REQUIRED":
      return {
        tone: "info",
        title: "表示名とユーザー名を入力してください。",
        description: "必須項目を埋めると登録を続けられます。",
      };
    case "USERNAME_ALREADY_USED":
      return {
        tone: "error",
        title: "そのユーザー名はすでに使われています。",
        description: "別のユーザー名に変更して、もう一度お試しください。",
      };
    case "USERNAME_ALREADY_USED_BY_OTHER_WALLET":
      return {
        tone: "error",
        title: "そのユーザー名は別のウォレットで使われています。",
        description: "自分の公開名に近い別のユーザー名へ変更してください。",
      };
    case "USER_PROFILE_NOT_FOUND":
      return {
        tone: "error",
        title: "先にユーザー情報の登録が必要です。",
        description: "ユーザー登録を完了してから、もう一度お試しください。",
      };
    case "CREATOR_NOT_FOUND":
      return {
        tone: "error",
        title: "クリエイタープロフィールが見つかりませんでした。",
        description: "ページを更新して、状態を確認してからやり直してください。",
      };
    case "TITLE_REQUIRED":
    case "BODY_REQUIRED":
      return {
        tone: "info",
        title: normalizedMessage === "BODY_REQUIRED"
          ? "投稿本文を入力してください。"
          : "タイトルを入力してください。",
      };
    case "BODY_TOO_LONG":
      return {
        tone: "info",
        title: "投稿本文は 2000 文字以内で入力してください。",
      };
    case "AMOUNT_INVALID":
      return {
        tone: "info",
        title: "金額の入力を確認してください。",
        description: "0 より大きい数値で入力してください。",
      };
    case "OCCURRED_AT_INVALID":
      return {
        tone: "info",
        title: "日付の入力を確認してください。",
      };
    case "PROJECT_ID_INVALID":
    case "PROJECT_ID_MISSING":
    case "CREATOR_PROFILE_ID_INVALID":
    case "CREATOR_PROFILE_ID_REQUIRED":
      return {
        tone: "error",
        title: "保存先の情報を確認できませんでした。",
        description: "画面を更新してから、もう一度お試しください。",
      };
    case "PROJECT_NOT_FOUND":
      return {
        tone: "error",
        title: "Project が見つかりませんでした。",
        description: "画面を更新してから、Project の状態を確認してください。",
      };
    case "PROJECT_NOT_FOUND_OR_FORBIDDEN":
      return {
        tone: "error",
        title: "選んだ project を確認してください。",
        description: "自分の project が選ばれているか確認して、もう一度お試しください。",
      };
    case "FORBIDDEN_NOT_OWNER":
      return {
        tone: "attention",
        title: "この操作はプロジェクトオーナーのみ実行できます。",
        description: "接続中のウォレットが owner か確認して、もう一度お試しください。",
      };
    case "TARGET_INVALID":
    case "GOAL_TARGET_INVALID":
      return {
        tone: "info",
        title: "Goal の金額を確認してください。",
        description: "0 より大きい数値で入力してください。",
      };
    case "GOAL_NOT_SET":
      return {
        tone: "info",
        title: "先に Goal を設定してください。",
        description: "達成確定の前に、目標金額を保存する必要があります。",
      };
    case "GOAL_NOT_REACHED":
      return {
        tone: "attention",
        title: "現在の進捗ではまだ達成確定できません。",
        description: "確認済み支援額が目標金額に届いた後で、もう一度お試しください。",
      };
    case "SUMMARY_FETCH_FAILED":
    case "GOAL_GET_FAILED":
      return {
        tone: "error",
        title: "Summary の取得に失敗しました。",
        description: "少し待ってから再読み込みしてください。",
      };
    case "PROJECT_CURRENCY_INVALID":
      return {
        tone: "error",
        title: "Project の通貨設定を確認できませんでした。",
      };
    case "MEDIA_FIELDS_MISMATCH":
      return {
        tone: "info",
        title: "メディア種別と URL をそろえて入力してください。",
      };
    case "MEDIA_TYPE_INVALID":
      return {
        tone: "info",
        title: "メディア種別を選んでください。",
      };
    case "MEDIA_URL_INVALID":
      return {
        tone: "info",
        title: "メディア URL は http(s) 形式で入力してください。",
      };
    case "CONTENT_URL_REQUIRED":
      return {
        tone: "info",
        title: "投稿 URL を入力してください。",
      };
    case "PROFILE_FREE_TEXT_REQUIRED":
      return {
        tone: "info",
        title: "活動内容を自由文で入力してください。",
      };
    case "PROFILE_BIO_REQUIRED":
      return {
        tone: "info",
        title: "紹介文を入力してください。",
      };
    case "POST_DRAFT_REQUIRED":
      return {
        tone: "info",
        title: "投稿文を入力してください。",
      };
    case "AI_AGENT_NAME_REQUIRED":
      return {
        tone: "info",
        title: "agent 名を入力してください。",
      };
    case "PROFILE_DRAFT_REQUEST_FAILED":
    case "PROFILE_DRAFT_RESPONSE_INVALID":
    case "PROFILE_DRAFT_POST_FAILED":
      return {
        tone: "error",
        title: "AI 下書きの生成に失敗しました。",
        description: "手動で入力するか、少し待ってからもう一度お試しください。",
      };
    case "SHARE_DRAFT_REQUEST_FAILED":
    case "SHARE_DRAFT_POST_FAILED":
    case "INVALID_SHARE_DRAFT_INPUT":
      return {
        tone: "error",
        title: "AI 下書きを取得できませんでした。",
        description: "手動で入力するか、少し待ってからもう一度お試しください。",
      };
    case "COMPOSE_HANDOFF_FAILED":
      return {
        tone: "error",
        title: "Compose への引き渡しに失敗しました。",
        description: "ブラウザの状態を確認して、もう一度お試しください。",
      };
    case "SHARE_DRAFT_MISSING_CONTEXT":
      return {
        tone: "info",
        title: "公開ページ URL と表示名を確認してください。",
        description: "公開ページに必要な基本情報がそろうと文面を生成できます。",
      };
    case "CLIPBOARD_UNAVAILABLE":
      return {
        tone: "attention",
        title: "この環境ではコピーできません。",
        description: "手動で文面を選択してコピーしてください。",
      };
    case "COPY_FAILED":
      return {
        tone: "error",
        title: "コピーに失敗しました。",
        description: "少し待ってから、もう一度お試しください。",
      };
    case "INVALID_JSON":
      return {
        tone: "error",
        title: "送信内容を読み取れませんでした。",
        description: "入力内容を確認して、もう一度お試しください。",
      };
    case "INTERNAL_ERROR":
    case "POST_CREATE_FAILED":
    case "POST_CREATE_RESPONSE_INVALID":
    case "POSTS_POST_FAILED":
      return {
        tone: "error",
        title: "保存に失敗しました。",
        description: "少し待ってから、もう一度お試しください。",
      };
    case "SNS_AGENTS_FETCH_FAILED":
    case "SNS_AGENTS_RESPONSE_INVALID":
      return {
        tone: "error",
        title: "AI agent の取得に失敗しました。",
        description: "少し待ってから再読み込みしてください。",
      };
    case "SNS_JOBS_FETCH_FAILED":
    case "SNS_JOBS_RESPONSE_INVALID":
      return {
        tone: "error",
        title: "AI job の取得に失敗しました。",
        description: "少し待ってから再読み込みしてください。",
      };
    case "SNS_AGENT_CREATE_FAILED":
    case "SNS_AGENT_CREATE_RESPONSE_INVALID":
      return {
        tone: "error",
        title: "AI agent の作成に失敗しました。",
        description: "入力内容を確認して、もう一度お試しください。",
      };
    case "SNS_JOB_CREATE_FAILED":
    case "SNS_JOB_CREATE_RESPONSE_INVALID":
      return {
        tone: "error",
        title: "AI job のキュー登録に失敗しました。",
        description: "少し待ってから、もう一度お試しください。",
      };
    case "SNS_POSTS_FETCH_FAILED":
    case "SNS_POSTS_RESPONSE_INVALID":
      return {
        tone: "error",
        title: "投稿一覧の取得に失敗しました。",
        description: "少し待ってから再読み込みしてください。",
      };
    case "SNS_SUMMARY_FETCH_FAILED":
    case "SNS_SUMMARY_RESPONSE_INVALID":
      return {
        tone: "error",
        title: "分析サマリーの取得に失敗しました。",
        description: "少し待ってから再読み込みしてください。",
      };
    case "SNS_POST_STATUS_UPDATE_FAILED":
    case "SNS_POST_STATUS_RESPONSE_INVALID":
      return {
        tone: "error",
        title: "投稿状態の更新に失敗しました。",
        description: "少し待ってから、もう一度お試しください。",
      };
    case "MYPAGE_GROWTH_OVERVIEW_FAILED":
    case "MYPAGE_GROWTH_OVERVIEW_INVALID":
      return {
        tone: "error",
        title: "成長データの取得に失敗しました。",
        description: "少し時間をおいて再読み込みしてください。",
      };
    case "MYPAGE_MANAGER_FEED_FAILED":
    case "MYPAGE_MANAGER_FEED_INVALID":
      return {
        tone: "error",
        title: "Manager Feed の取得に失敗しました。",
        description: "接続状態を確認して、少し待ってから再読み込みしてください。",
      };
    case "MYPAGE_PLANNER_FAILED":
    case "MYPAGE_PLANNER_INVALID":
      return {
        tone: "error",
        title: "予定データの取得に失敗しました。",
        description: "会議や期限の情報を少し待ってから再読み込みしてください。",
      };
    case "MYPAGE_GROWTH_REFLECTION_FAILED":
    case "MYPAGE_GROWTH_REFLECTION_INVALID":
      return {
        tone: "error",
        title: "振り返りデータの取得に失敗しました。",
        description: "少し時間をおいて再読み込みしてください。",
      };
    case "MYPAGE_SUPPORTER_OVERVIEW_FAILED":
    case "MYPAGE_SUPPORTER_OVERVIEW_INVALID":
      return {
        tone: "error",
        title: "サポーター概要の取得に失敗しました。",
        description: "接続状態を確認して、少し待ってから再読み込みしてください。",
      };
    case "MYPAGE_DASHBOARD_FETCH_FAILED":
    case "MYPAGE_DASHBOARD_INVALID":
      return {
        tone: "error",
        title: "運営データの取得に失敗しました。",
        description: "時間をおいて再度お試しください。",
      };
    case "AI_HOME_SUMMARY_UNAVAILABLE":
      return {
        tone: "error",
        title: "AIアシスタントの状況を取得できませんでした。",
        description: "少し待ってから再読み込みしてください。",
      };
    case "MYPAGE_DAILY_BRIEFING_FAILED":
    case "MYPAGE_DAILY_BRIEFING_INVALID":
      return {
        tone: "error",
        title: "今日のまとめを取得できませんでした。",
        description: "下のカードは引き続き使えます。少し待ってから再読み込みしてください。",
      };
    case "SUPPORTER_CRM_FAILED":
    case "SUPPORTER_CRM_INVALID":
      return {
        tone: "error",
        title: "支援者リストの取得に失敗しました。",
        description: "接続状態を確認して、少し待ってから再読み込みしてください。",
      };
    case "MYPAGE_FAN_ENGAGEMENT_FAILED":
    case "MYPAGE_FAN_ENGAGEMENT_INVALID":
      return {
        tone: "error",
        title: "応援タイムラインの取得に失敗しました。",
        description: "少し待ってから再読み込みしてください。",
      };
    default:
      break;
  }

  if (OWNER_AUTH_ERROR_CODES.has(normalizedMessage)) {
    return {
      tone: "attention",
      title: "この操作にはアプリ認証が必要です。",
      description:
        "ログイン用の署名を確認してから、もう一度お試しください。",
    };
  }

  if (
    lowerMessage.includes("user rejected") ||
    lowerMessage.includes("user denied") ||
    lowerMessage.includes("user cancelled") ||
    lowerMessage.includes("user canceled")
  ) {
    return {
      tone: "attention",
      title: "アプリ認証がキャンセルされました。",
      description:
        "署名を確認できたときに、もう一度お試しください。",
    };
  }

  if (trimmedMessage.length > 0 && !looksLikeCode(trimmedMessage)) {
    return {
      tone: "error",
      title: trimmedMessage,
    };
  }

  return {
    tone: "error",
    title: fallbackTitle,
  };
}

export function buildWorkspaceActionSuccessNotice(
  kind:
    | "userSaved"
    | "creatorApplied"
    | "creatorProfileSaved"
    | "expenseSaved"
    | "revenueSaved"
    | "aiManagerCreated"
    | "aiManagerSaved"
    | "fundingEvidenceSaved"
    | "shareLogSaved"
    | "x402Confirmed"
    | "x402MarkedFailed"
    | "goalSaved"
    | "goalAchieved"
    | "postPublished"
    | "metricsSaved"
    | "shareDraftGenerated"
    | "aiAgentCreated"
    | "aiJobQueued"
    | "postArchived"
    | "postRepublished"
): WorkspaceActionNotice {
  switch (kind) {
    case "userSaved":
      return {
        tone: "success",
        title: "ユーザー情報を保存しました。",
        description: "次は公開ページの準備へ進めます。",
      };
    case "creatorApplied":
      return {
        tone: "success",
        title: "クリエイター申請が完了しました。",
        description: "公開ページの設定と最初の投稿準備を続けられます。",
      };
    case "creatorProfileSaved":
      return {
        tone: "success",
        title: "公開ページの基本情報を保存しました。",
      };
    case "expenseSaved":
      return {
        tone: "success",
        title: "経費を保存しました。",
        description: "今月の支出集計にすぐ反映されます。",
      };
    case "revenueSaved":
      return {
        tone: "success",
        title: "収入を保存しました。",
        description: "今月の収支と記録一覧にすぐ反映されます。",
      };
    case "aiManagerCreated":
      return {
        tone: "success",
        title: "AIマネージャーを作成しました。",
        description: "次は役割と予算ルールを整えられます。",
      };
    case "aiManagerSaved":
      return {
        tone: "success",
        title: "AIマネージャー設定を保存しました。",
        description: "公開範囲と予算ルールの最新状態を反映しました。",
      };
    case "fundingEvidenceSaved":
      return {
        tone: "success",
        title: "top-up evidence を記録しました。",
        description: "必要なら次の ledger top-up に紐づけられます。",
      };
    case "shareLogSaved":
      return {
        tone: "success",
        title: "投稿記録を保存しました。",
        description: "あとで振り返れるよう、成長ログに反映しました。",
      };
    case "x402Confirmed":
      return {
        tone: "success",
        title: "x402 settlement を確認済みに更新しました。",
      };
    case "x402MarkedFailed":
      return {
        tone: "attention",
        title: "x402 settlement を失敗として記録しました。",
        description: "関連する billable capability は一時停止されます。",
      };
    case "goalSaved":
      return {
        tone: "success",
        title: "Goal を保存しました。",
        description: "公開ページと進捗サマリーに最新の目標を反映しました。",
      };
    case "goalAchieved":
      return {
        tone: "success",
        title: "目標達成を確定しました。",
        description: "Project status と次の settlement 導線に反映されます。",
      };
    case "postPublished":
      return {
        tone: "success",
        title: "投稿を公開しました。",
        description: "公開ページのフィードにもすぐ反映されます。",
      };
    case "metricsSaved":
      return {
        tone: "success",
        title: "指標を記録しました。",
        description: "最新のスナップショット一覧に反映しました。",
      };
    case "shareDraftGenerated":
      return {
        tone: "success",
        title: "拡散文面を生成しました。",
        description: "使いやすい文面を選んで、そのままコピーできます。",
      };
    case "aiAgentCreated":
      return {
        tone: "success",
        title: "AI agent を追加しました。",
        description: "役割ごとの運用をここから整理できます。",
      };
    case "aiJobQueued":
      return {
        tone: "success",
        title: "AI job をキューに追加しました。",
        description: "後続フェーズの実行フローに向けた準備として記録しました。",
      };
    case "postArchived":
      return {
        tone: "attention",
        title: "投稿をアーカイブしました。",
        description: "公開 feed からは非表示になります。",
      };
    case "postRepublished":
      return {
        tone: "success",
        title: "投稿を公開状態に戻しました。",
        description: "公開ページの feed に再び表示されます。",
      };
    default:
      return {
        tone: "success",
        title: "保存しました。",
      };
  }
}
