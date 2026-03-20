/** A single recipient row in a distribution plan */
export type DistributionPlanRow = {
  id?: string;
  recipientAddress: string;
  amountAtomic: string;
  memo: string;
  token: "JPYC" | "USDC";
};

/**
 * JSON stored in DistributionRun.planJson.
 * May be a structured object with a `rows` array (DistributionPlanDraftPayload shape)
 * or a flat array of rows.
 */
export type DistributionPlanJson =
  | { rows: DistributionPlanRow[]; version?: number; [key: string]: unknown }
  | DistributionPlanRow[];

/** Transaction hashes stored in DistributionRun.txHashes */
export type DistributionTxHashes = `0x${string}`[];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidDistributionPlanRow(v: unknown): boolean {
  if (!isRecord(v)) return false;
  if (typeof v.recipientAddress !== "string" || v.recipientAddress.length === 0)
    return false;
  if (typeof v.amountAtomic !== "string" || v.amountAtomic.length === 0)
    return false;
  if (typeof v.memo !== "string") return false;
  if (v.token !== "JPYC" && v.token !== "USDC") return false;
  return true;
}

/** Runtime validation of a DistributionPlanJson value. */
export function isValidDistributionPlan(v: unknown): v is DistributionPlanJson {
  if (Array.isArray(v)) return v.every(isValidDistributionPlanRow);
  if (isRecord(v) && Array.isArray(v.rows))
    return v.rows.every(isValidDistributionPlanRow);
  return false;
}
