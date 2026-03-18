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
