// lib/goalAutoAchieve.ts
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Goal 自動達成判定ユーティリティ
 * - CONFIRMED(JPYC) 合計が targetAmountJpyc に到達したら goal.achievedAt を立てる
 * - project.status は「進行中ステータス」のときだけ GOAL_ACHIEVED に更新（巻き戻し防止）
 * - 冪等（既に achievedAt があれば何もしない）
 *
 * 重要:
 * - この関数は $transaction を呼びません（TransactionClient でも動作させるため）
 * - トランザクション制御は呼び出し側で行ってください
 */
export type DbLike = PrismaClient | Prisma.TransactionClient;

// Decimal(38,18) を「円（floor）」として扱う（既存ロジックと揃える）
function decimalToJpycIntFloor(amountDecimal: Prisma.Decimal | null): number {
  if (!amountDecimal) return 0;
  const s = amountDecimal.toString();
  const [i] = s.split(".");
  const n = Number(i || "0");
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/**
 * project.status を GOAL_ACHIEVED に寄せても良い “進行中” ステータス
 * - BRIDGED / DISTRIBUTED 等に進んでいる場合は巻き戻さない
 * - あなたの status 設計に合わせて調整してください（安全側の最小セット）
 */
const STATUS_CAN_BECOME_GOAL_ACHIEVED = new Set<string>([
  "DRAFT",
  "READY_TO_BRIDGE",
  "FUNDING",
  "OPEN",
]);

export type AutoAchieveResult =
  | {
      ok: true;
      achieved: true;
      changed: boolean; // 今回 achievedAt が立ったか
      projectStatusUpdated: boolean;
      confirmedJpyc: number;
      targetJpyc: number;
      achievedAtIso: string; // 現在の achievedAt
    }
  | {
      ok: true;
      achieved: false;
      reason:
        | "GOAL_NOT_SET"
        | "TARGET_INVALID"
        | "NOT_REACHED"
        | "ALREADY_ACHIEVED";
      confirmedJpyc: number;
      targetJpyc: number | null;
    };

/**
 * 目標達成の自動更新（冪等）
 * - 呼び出し側が $transaction の内外どちらでも、同じように動く
 */
export async function tryAutoAchieveGoal(params: {
  db: DbLike;
  projectId: bigint;
  now?: Date;
}): Promise<AutoAchieveResult> {
  const now = params.now ?? new Date();

  // project.status は status 更新の可否判断に必要
  const project = await params.db.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, status: true },
  });

  if (!project) {
    // 呼び元で project existence を保証している想定だが、落とさずに終了
    return {
      ok: true,
      achieved: false,
      reason: "GOAL_NOT_SET",
      confirmedJpyc: 0,
      targetJpyc: null,
    };
  }

  const goal = await params.db.goal.findUnique({
    where: { projectId: params.projectId },
    select: { id: true, targetAmountJpyc: true, achievedAt: true },
  });

  if (!goal) {
    return {
      ok: true,
      achieved: false,
      reason: "GOAL_NOT_SET",
      confirmedJpyc: 0,
      targetJpyc: null,
    };
  }

  const targetJpyc = goal.targetAmountJpyc;
  if (!Number.isFinite(targetJpyc) || targetJpyc <= 0) {
    return {
      ok: true,
      achieved: false,
      reason: "TARGET_INVALID",
      confirmedJpyc: 0,
      targetJpyc: Number.isFinite(targetJpyc) ? targetJpyc : null,
    };
  }

  // 既に達成済みなら何もしない（冪等）
  if (goal.achievedAt) {
    return {
      ok: true,
      achieved: false,
      reason: "ALREADY_ACHIEVED",
      confirmedJpyc: 0,
      targetJpyc,
    };
  }

  // CONFIRMED(JPYC) 合計を集計
  const sum = await params.db.contribution.aggregate({
    where: {
      projectId: params.projectId,
      status: "CONFIRMED",
      currency: "JPYC",
    },
    _sum: { amountDecimal: true },
  });

  const confirmedJpyc = decimalToJpycIntFloor(sum._sum.amountDecimal ?? null);

  if (confirmedJpyc < targetJpyc) {
    return {
      ok: true,
      achieved: false,
      reason: "NOT_REACHED",
      confirmedJpyc,
      targetJpyc,
    };
  }

  // 到達しているので achievedAt を立てる（競合に強く：achievedAt IS NULL 条件で更新）
  // project.status も「進行中」の場合のみ GOAL_ACHIEVED にする
  const shouldUpdateStatus = STATUS_CAN_BECOME_GOAL_ACHIEVED.has(
    project.status
  );

  // ✅ ここでは $transaction を呼ばない（db が tx の場合があるため）
  // 呼び出し側で $transaction していない場合でも、最低限 updateMany の条件で競合耐性を確保する
  const g = await params.db.goal.updateMany({
    where: { projectId: params.projectId, achievedAt: null },
    data: { achievedAt: now, updatedAt: now },
  });

  const p = shouldUpdateStatus
    ? await params.db.project.updateMany({
        where: { id: params.projectId, status: project.status },
        data: { status: "GOAL_ACHIEVED", updatedAt: now },
      })
    : { count: 0 };

  const achievedAtRow = await params.db.goal.findUnique({
    where: { projectId: params.projectId },
    select: { achievedAt: true },
  });

  const achievedAt = achievedAtRow?.achievedAt ?? now;

  return {
    ok: true,
    achieved: true,
    changed: g.count > 0,
    projectStatusUpdated: p.count > 0,
    confirmedJpyc,
    targetJpyc,
    achievedAtIso: achievedAt.toISOString(),
  };
}
