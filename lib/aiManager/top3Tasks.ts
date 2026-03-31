/**
 * UX-1: AIマネージャー Top3 タスク — 優先ロジック
 *
 * 既存シグナル（profileMissing / goalMissing / waitingApprovalCount / postCount 等）を
 * 参照して、クリエイターが今すべきタスク上位3件を返す。
 * 新規 DB クエリなし。derived value のみ。
 */

import type { AiManagerTop3Task } from "@/lib/aiManager/taskMeta";

export type Top3TasksInput = {
  profileMissing: boolean;
  goalMissing: boolean;
  settlementAttentionNeeded: boolean;
  waitingApprovalCount: number;
  /** null = まだ取得中 */
  postCount: number | null;
  avgProgressPct: number;
  hrefs: {
    settings: () => void;          // settings ページを開く (onOpenSettings 相当)
    aiOfficeInbox: string;
    aiOfficeCreatePromotion: string;
    aiOfficeCreateManager: string;
    publicProfile: string;
  };
};

/** 投稿停滞: postCount が 0 or null */
function isStagnantPosting(postCount: number | null): boolean {
  return postCount === null || postCount === 0;
}

/** 活動停滞: 投稿 0 かつプロフィール / Goal 完備ユーザー（30日以上動いていない想定） */
function isStagnantUser(input: Top3TasksInput): boolean {
  return (
    !input.profileMissing &&
    !input.goalMissing &&
    isStagnantPosting(input.postCount) &&
    input.waitingApprovalCount === 0
  );
}

export function deriveTop3Tasks(input: Top3TasksInput): AiManagerTop3Task[] {
  const tasks: AiManagerTop3Task[] = [];

  // ── 1. プロフィール未完 ─────────────────────────────────────────
  if (input.profileMissing) {
    tasks.push({
      id: "profile-setup",
      title: "プロフィールに紹介文を1文追加する",
      purpose: "公開ページの第一印象が決まる。紹介文がないと支援者に素通りされやすい。",
      estimatedMinutes: 2,
      difficulty: 1,
      category: "trust",
      outcomeLabel: "プロフィール充実度 UP / ページの信頼感 UP",
      actionKind: "inline",
      actionLabel: "この場でやる",
      inlinePanelKind: "profile-edit",
      completionFeedback: {
        message: "プロフィールを更新しました",
        growthLabel: "信頼度 +5%",
      },
    });
  }

  // ── 2. Goal 未設定 ────────────────────────────────────────────
  if (input.goalMissing) {
    tasks.push({
      id: "goal-setup",
      title: "今の活動 Goal と使い道を設定する",
      purpose: "Goal がないと支援者が「何のために応援するか」分からず、行動につながりにくい。",
      estimatedMinutes: 5,
      difficulty: 1,
      category: "revenue",
      outcomeLabel: "支援導線が完成 / 応援が集まりやすくなる",
      actionKind: "settings",
      actionLabel: "Goal を設定する",
    });
  }

  // ── 3. 承認待ち AI タスクあり ─────────────────────────────────
  if (input.waitingApprovalCount > 0) {
    tasks.push({
      id: "approve-ai-tasks",
      title: `AI の提案 ${input.waitingApprovalCount.toString()} 件を確認・承認する`,
      purpose: "AI の提案を止めておくと、せっかくの下書きが古くなる。今日中に確認するのが効く。",
      estimatedMinutes: 5,
      difficulty: 1,
      category: "growth",
      outcomeLabel: "提案が実務につながる / AI が次の提案を出しやすくなる",
      actionKind: "href",
      actionLabel: "Inbox を開く",
      href: input.hrefs.aiOfficeInbox,
    });
  }

  // ── 4. 停滞ユーザー（投稿ゼロ・プロフィール完備） ────────────
  if (isStagnantUser(input) && tasks.length < 3) {
    tasks.push({
      id: "restart-post",
      title: "1 分でできる近況メモを投稿する",
      purpose: "長期間の沈黙より、短い近況投稿 1 本の方がファンに活動継続を伝えやすい。",
      estimatedMinutes: 2,
      difficulty: 1,
      category: "relationship",
      outcomeLabel: "活動継続シグナル / ファンとの距離が縮まる",
      actionKind: "inline",
      actionLabel: "この場でやる",
      inlinePanelKind: "posting-draft",
      completionFeedback: {
        message: "Compose に下書きを送りました",
        growthLabel: "関係性 +3%",
      },
    });
  }

  // ── 5. 精算確認が必要 ────────────────────────────────────────
  if (input.settlementAttentionNeeded && tasks.length < 3) {
    tasks.push({
      id: "settlement-check",
      title: "達成後の精算状況を確認する",
      purpose: "達成済みプロジェクトを放置すると、次の Goal 設定や配分の段取りが遅れる。",
      estimatedMinutes: 5,
      difficulty: 2,
      category: "revenue",
      outcomeLabel: "精算プロセスが前進 / 次の Goal 設定が可能になる",
      actionKind: "settings",
      actionLabel: "設定・準備を開く",
    });
  }

  // ── 6. 投稿停滞（ポストカウント 0 だがプロフィール / Goal 完備） ──
  if (
    !isStagnantUser(input) &&
    isStagnantPosting(input.postCount) &&
    tasks.length < 3
  ) {
    tasks.push({
      id: "first-post",
      title: "最初の投稿を AI と一緒に作る",
      purpose: "投稿がゼロだと公開ページが寂しく見える。AI 下書きで 5 分で 1 本作れる。",
      estimatedMinutes: 5,
      difficulty: 1,
      category: "growth",
      outcomeLabel: "公開ページに動きが出る / ファンへの第一印象が改善",
      actionKind: "inline",
      actionLabel: "この場でやる",
      inlinePanelKind: "posting-draft",
      completionFeedback: {
        message: "Compose に下書きを送りました",
        growthLabel: "成長 +5%",
      },
    });
  }

  // ── 7. 進捗シェア（活動中ユーザー） ─────────────────────────
  if (
    !input.profileMissing &&
    !input.goalMissing &&
    (input.postCount ?? 0) > 0 &&
    input.avgProgressPct > 0 &&
    input.avgProgressPct < 100 &&
    tasks.length < 3
  ) {
    tasks.push({
      id: "progress-share",
      title: "今の進捗を伝える投稿を 1 本出す",
      purpose: "進捗の見える化はファンの継続応援の一番の動機になる。",
      estimatedMinutes: 5,
      difficulty: 2,
      category: "relationship",
      outcomeLabel: "ファンの継続応援が増える / 活動の勢いが伝わる",
      actionKind: "inline",
      actionLabel: "この場でやる",
      inlinePanelKind: "posting-draft",
      completionFeedback: {
        message: "Compose に下書きを送りました",
        growthLabel: "関係性 +4%",
      },
    });
  }

  // ── 8. 関係性タスク（活動中・全条件クリア） ──────────────────
  if (!input.profileMissing && !input.goalMissing && tasks.length < 3) {
    tasks.push({
      id: "next-action-plan",
      title: "今週の次の一手を AI に整理してもらう",
      purpose: "定期的に方向性を整理すると、迷わず動ける時間が増える。",
      estimatedMinutes: 5,
      difficulty: 2,
      category: "growth",
      outcomeLabel: "今週の優先順位が明確に / AI 提案の精度が上がる",
      actionKind: "href",
      actionLabel: "Manager Agent を開く",
      href: input.hrefs.aiOfficeCreateManager,
    });
  }

  return tasks.slice(0, 3);
}
