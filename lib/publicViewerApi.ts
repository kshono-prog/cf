import { getMeStatusByAddress } from "@/lib/mypageMe";
import {
  normalizeMyPageMePayload,
  type MyPageMePayload,
} from "@/lib/mypageApiResponses";
import type { MeStatus } from "@/lib/mypage/types";

export type PublicViewerOk = {
  ok: true;
} & MyPageMePayload;

export type PublicViewerErr = {
  ok: false;
  error: "PUBLIC_VIEWER_GET_FAILED";
};

type PublicViewerDeps = {
  getMeStatusByAddress: (address: string) => Promise<MeStatus>;
};

const publicViewerDeps: PublicViewerDeps = {
  getMeStatusByAddress,
};

function createEmptyViewerPayload(): PublicViewerOk {
  return {
    ok: true,
    hasUser: false,
    hasCreator: false,
    user: null,
    creator: null,
    projectId: null,
    projectIdsByCurrency: {
      JPYC: null,
      USDC: null,
    },
  };
}

export async function fetchPublicViewerByAddress(
  address: string | null,
  deps: PublicViewerDeps = publicViewerDeps
): Promise<{
  status: 200 | 500;
  body: PublicViewerOk | PublicViewerErr;
}> {
  const normalizedAddress = typeof address === "string" ? address.trim() : "";
  if (!normalizedAddress) {
    return {
      status: 200,
      body: createEmptyViewerPayload(),
    };
  }

  try {
    const me = await deps.getMeStatusByAddress(normalizedAddress);
    return {
      status: 200,
      body: {
        ok: true,
        ...normalizeMyPageMePayload(me),
      },
    };
  } catch {
    return {
      status: 500,
      body: {
        ok: false,
        error: "PUBLIC_VIEWER_GET_FAILED",
      },
    };
  }
}
