import { NextResponse } from "next/server";

import type { CreatorProfile } from "@/types/creator";
import type { MeStatus } from "@/lib/mypage/types";
import { getMeStatusByAddress } from "@/lib/mypageMe";

export type MyPageMePayload = {
  hasUser: boolean;
  hasCreator: boolean;
  user: { displayName: string; profile: string | null } | null;
  creator: CreatorProfile | null;
  projectId: string | null;
  projectIdsByCurrency: {
    JPYC: string | null;
    USDC: string | null;
  };
};

export type MyPageMutationOk = {
  ok: true;
  me: MyPageMePayload;
};

export type MyPageCreatorMutationOk = MyPageMutationOk & {
  creator: CreatorProfile | null;
};

export type MyPageMutationErr = {
  ok: false;
  error: string;
  detail?: string;
};

export function normalizeMyPageMePayload(me: MeStatus): MyPageMePayload {
  return {
    hasUser: me.hasUser,
    hasCreator: me.hasCreator,
    user: me.user
      ? {
          displayName: me.user.displayName ?? "",
          profile: me.user.profile ?? null,
        }
      : null,
    creator: me.creator ?? null,
    projectId: me.projectId ?? null,
    projectIdsByCurrency: me.projectIdsByCurrency ?? {
      JPYC: null,
      USDC: null,
    },
  };
}

export async function okMyPageMutationResponse(
  addressRaw: string,
  extra?: { creator?: CreatorProfile | null }
): Promise<NextResponse<MyPageMutationOk | MyPageCreatorMutationOk>> {
  const me = await getMeStatusByAddress(addressRaw);
  return NextResponse.json({
    ok: true,
    me: normalizeMyPageMePayload(me),
    ...(extra?.creator !== undefined ? { creator: extra.creator } : {}),
  });
}

export function errMyPageMutationResponse(
  error: string,
  status: number,
  detail?: string
): NextResponse<MyPageMutationErr> {
  return NextResponse.json({ ok: false, error, detail }, { status });
}
