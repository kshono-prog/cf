// /lib/mypage/types.ts
import type { CreatorProfile } from "@/types/creator";
import type { ProjectIdsByCurrency } from "@/lib/mypage/accountPageTypes";

export type MeStatus = {
  hasUser: boolean;
  hasCreator: boolean;
  user?: {
    username?: string;
    displayName?: string;
    profile?: string | null;
  } | null;
  creator?: CreatorProfile | null;
  projectId?: string | null;
  projectIdsByCurrency?: ProjectIdsByCurrency;
};

export type Status =
  | "loading"
  | "unconnected"
  | "authRequired"
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
  nativeBalance?: string;
  claimableAmount?: string;
  faucetAddress?: string;
  faucetBalance?: string;
  nativeSymbol?: string;
};
