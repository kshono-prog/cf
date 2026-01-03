// lib/contracts/eventFunding.ts
import { Contract, Wallet } from "ethers";
import type { ContractTransactionResponse } from "ethers";

export const EVENT_FUNDING_ABI = [
  {
    inputs: [],
    name: "bridge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export type EventFundingContract = Contract & {
  bridge: () => Promise<ContractTransactionResponse>;
};

export function getEventFundingContract(
  address: string,
  signer: Wallet
): EventFundingContract {
  return new Contract(
    address,
    EVENT_FUNDING_ABI,
    signer
  ) as EventFundingContract;
}
