/**
 * AI Manager の財務運営リスクレベルを creator 単位で導出する。
 *
 * Manager Desk の Contact Pipeline / Opportunity CRM に表示し、
 * x402 決済停止・AI Manager 停止を Manager が把握できるようにする。
 */

export type FinancialOpsRiskLevel = "NONE" | "WARNING" | "ALERT";

export type SerializedFinancialOpsRisk = {
  level: FinancialOpsRiskLevel;
  /** リスク発生理由の短文 */
  reason: string | null;
  /**
   * フラグ解除条件。
   * - ALERT: owner が x402 settlement を解決し billing を再開すると解除
   * - WARNING: owner が AI Manager を再開すると解除
   */
  clearCondition: string | null;
};

const NONE_RISK: SerializedFinancialOpsRisk = {
  level: "NONE",
  reason: null,
  clearCondition: null,
};

/**
 * AI Manager のステータスと billing policy ステータスからリスクレベルを導出する。
 *
 * 入力は string 型で受け取り、特定の enum に依存しない。
 */
export function deriveFinancialOpsRisk(input: {
  aiManagerStatus: string | null;
  billingPolicyStatus: string | null;
}): SerializedFinancialOpsRisk {
  // ALERT: billing が PAUSED = x402 決済失敗などで billable capability 停止中
  if (input.billingPolicyStatus === "PAUSED") {
    return {
      level: "ALERT",
      reason: "AI Manager の billable 決済が停止中です。",
      clearCondition: "owner が x402 settlement を解決し billing を再開すると解除されます。",
    };
  }

  // WARNING: AI Manager 自体が停止中（owner が意図的に pause した）
  if (input.aiManagerStatus === "PAUSED") {
    return {
      level: "WARNING",
      reason: "AI Manager が一時停止中です。自動運営補助は休止しています。",
      clearCondition: "owner が AI Manager を再開すると解除されます。",
    };
  }

  return NONE_RISK;
}

export { NONE_RISK as FINANCIAL_OPS_RISK_NONE };
