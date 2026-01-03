// /lib/mypage/types.ts
import type { CreatorProfile } from "@/types/creator";

export type MeStatus = {
  hasUser: boolean;
  hasCreator: boolean;
  user?: {
    displayName?: string;
    profile?: string | null;
  } | null;
  creator?: CreatorProfile | null;
  projectId?: string | null;
};

export type Status =
  | "loading"
  | "unconnected"
  | "noUser"
  | "userOnly"
  | "creatorReady";

export type GasEligibility = {
  chainId: number;
  address: string;
  eligible: boolean;
  reasons: string[];
  minJpyc?: number;
  jpycBalance?: string;
  polBalance?: string;
  claimableAmountPol?: string;
  faucetAddress?: string;
  faucetBalancePol?: string;
};
