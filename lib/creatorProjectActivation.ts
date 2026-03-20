import type { CurrencyCode } from "@/lib/currencyUtils";

export type CreatorProjectActivationFields = {
  activeProjectIdJpyc?: bigint;
  activeProjectIdUsdc?: bigint;
};

export function buildCreatorProjectActivationFields(args: {
  projectId: bigint;
  currency: CurrencyCode;
}): CreatorProjectActivationFields {
  if (args.currency === "USDC") {
    return { activeProjectIdUsdc: args.projectId };
  }

  return { activeProjectIdJpyc: args.projectId };
}
