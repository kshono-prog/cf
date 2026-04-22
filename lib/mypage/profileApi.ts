import type { Address } from "viem";
import type {
  CreatorProfile,
  SocialLinks,
  YoutubeVideo,
} from "@/types/creator";
import type { EcosystemRole } from "@/lib/creatorTaxonomy";
import type { CreatorPublicPageConfig } from "@/lib/publicPageConfig";
import { parseCreatorProfile } from "@/lib/serializers/creator";
import type { MeStatus } from "@/lib/mypage/types";
import type { MyPageDashboardData } from "@/lib/mypage/dashboardTypes";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";
import type { MyPageCreatorMutationOk } from "@/lib/mypageApiResponses";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import {
  isRecord,
  requestJson,
  toApiError,
  asStringOrNull,
  asBooleanOrNull,
} from "@/lib/mypage/mypageApiShared";

export async function fetchMe(args: {
  apiBase: string;
  address: Address;
}): Promise<{ ok: true; data: MeStatus } | { ok: false; error: string }> {
  const params = new URLSearchParams({ address: args.address });
  const res = await ownerAuthFetch({
    address: args.address,
    apiBase: args.apiBase,
    url: `${args.apiBase}/api/me?${params.toString()}`,
    init: { cache: "no-store" },
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

  const data: unknown = await res.json().catch(() => null);
  const parsed = parseMeStatus(data);
  if (!parsed) return { ok: false, error: "ME_RESPONSE_INVALID" };
  return { ok: true, data: parsed };
}

export async function fetchMyPageDashboard(args: {
  apiBase: string;
  address: Address;
  view: WorkspaceView;
}): Promise<{ ok: true; data: MyPageDashboardData } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    address: args.address,
    view: args.view,
  });
  const res = await ownerAuthFetch({
    address: args.address,
    apiBase: args.apiBase,
    url: `${args.apiBase}/api/mypage/dashboard?${params.toString()}`,
    init: {
      cache: "no-store",
    },
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

  const data: unknown = await res.json().catch(() => null);
  return { ok: true, data: data as MyPageDashboardData };
}

export function parseMeStatusPayload(value: unknown): MeStatus | null {
  if (!isRecord(value)) return null;

  const hasUser = asBooleanOrNull(value.hasUser);
  const hasCreator = asBooleanOrNull(value.hasCreator);
  if (hasUser === null || hasCreator === null) return null;

  let user: MeStatus["user"] = null;
  if (value.user === null) {
    user = null;
  } else if (isRecord(value.user)) {
    const username = asStringOrNull(value.user.username);
    const displayName = asStringOrNull(value.user.displayName);
    const profile =
      value.user.profile === null ? null : asStringOrNull(value.user.profile);
    if (!username || !displayName || typeof profile === "undefined") return null;
    user = { username, displayName, profile };
  } else {
    return null;
  }

  const projectId =
    value.projectId === null ? null : asStringOrNull(value.projectId);
  if (typeof projectId === "undefined") return null;

  if (!isRecord(value.projectIdsByCurrency)) return null;
  const jpyc =
    value.projectIdsByCurrency.JPYC === null
      ? null
      : asStringOrNull(value.projectIdsByCurrency.JPYC);
  const usdc =
    value.projectIdsByCurrency.USDC === null
      ? null
      : asStringOrNull(value.projectIdsByCurrency.USDC);
  if (typeof jpyc === "undefined" || typeof usdc === "undefined") return null;

  let creator: MeStatus["creator"] = null;
  if (value.creator === null) {
    creator = null;
  } else if (isRecord(value.creator)) {
    creator = parseCreatorProfile(value.creator);
    if (!creator) return null;
  } else {
    return null;
  }

  return {
    hasUser,
    hasCreator,
    user,
    creator,
    projectId,
    projectIdsByCurrency: {
      JPYC: jpyc,
      USDC: usdc,
    },
  };
}

function parseMeStatus(value: unknown): MeStatus | null {
  if (!isRecord(value) || value.ok !== true) return null;
  return parseMeStatusPayload(value);
}

export async function saveMyPageUser(args: {
  apiBase: string;
  address: Address;
  username: string;
  displayName: string;
  profile: string;
}): Promise<{ ok: true; data: MeStatus } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `${args.apiBase}/api/user`,
    method: "POST",
    body: {
      address: args.address,
      username: args.username,
      displayName: args.displayName,
      profile: args.profile,
    },
    authAddress: args.address,
    apiBase: args.apiBase,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "USER_SAVE_FAILED"),
      httpStatus: res.status,
    };
  }

  const parsed = isRecord(json) && json.ok === true ? parseMeStatusPayload(json.me) : null;
  if (!parsed) {
    return {
      ok: false,
      error: "USER_SAVE_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return { ok: true, data: parsed };
}

export async function requestCreatorApply(args: {
  apiBase: string;
  address: Address;
}): Promise<{ ok: true; data: MeStatus } | { ok: false; error: string; httpStatus: number }> {
  const { res, json } = await requestJson({
    url: `${args.apiBase}/api/creator/apply`,
    method: "POST",
    body: { address: args.address },
    authAddress: args.address,
    apiBase: args.apiBase,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "CREATOR_APPLY_FAILED"),
      httpStatus: res.status,
    };
  }

  const parsed = isRecord(json) && json.ok === true ? parseMeStatusPayload(json.me) : null;
  if (!parsed) {
    return {
      ok: false,
      error: "CREATOR_APPLY_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return { ok: true, data: parsed };
}

export async function updateMyPageCreatorProfile(args: {
  address: Address;
  displayName: string;
  profile: string;
  avatarUrl: string;
  externalUrl: string;
  themeColor: string;
  creatorType: CreatorProfile["creatorType"];
  ecosystemRole: EcosystemRole | null;
  publicPage: CreatorPublicPageConfig;
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
}): Promise<
  | { ok: true; data: MeStatus; creator: CreatorProfile | null }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: "/api/creator",
    method: "PATCH",
    body: {
      address: args.address,
      displayName: args.displayName,
      profile: args.profile,
      avatarUrl: args.avatarUrl || null,
      externalUrl: args.externalUrl.trim() || null,
      themeColor: args.themeColor.trim() || null,
      creatorType: args.creatorType ?? null,
      ecosystemRole: args.ecosystemRole ?? null,
      publicPage: args.publicPage,
      socials: args.socials,
      youtubeVideos: args.youtubeVideos.map((video) => ({
        url: video.url.trim(),
        title: video.title.trim(),
        description: video.description.trim(),
      })),
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "CREATOR_UPDATE_FAILED"),
      httpStatus: res.status,
    };
  }

  const parsed = isRecord(json) && json.ok === true ? parseMeStatusPayload(json.me) : null;
  if (!parsed) {
    return {
      ok: false,
      error: "CREATOR_UPDATE_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return {
    ok: true,
    data: parsed,
    creator: (json as MyPageCreatorMutationOk).creator ?? null,
  };
}

export async function ensureCreatorProfileQrCode(args: {
  address: Address;
  force?: boolean;
}): Promise<
  | {
      ok: true;
      qrcodeUrl: string;
      reused: boolean;
      targetUrl: string;
      username: string;
      address: string;
    }
  | { ok: false; error: string; httpStatus: number }
> {
  const { res, json } = await requestJson({
    url: "/api/creator/qrcode",
    method: "POST",
    body: {
      address: args.address,
      force: args.force === true,
    },
    authAddress: args.address,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: toApiError(json, "CREATOR_QRCODE_ENSURE_FAILED"),
      httpStatus: res.status,
    };
  }

  if (!isRecord(json) || json.ok !== true) {
    return {
      ok: false,
      error: "CREATOR_QRCODE_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  const qrcodeUrl = asStringOrNull(json.qrcodeUrl);
  const targetUrl = asStringOrNull(json.targetUrl);
  const username = asStringOrNull(json.username);
  const address = asStringOrNull(json.address);
  const reused = asBooleanOrNull(json.reused);

  if (!qrcodeUrl || !targetUrl || !username || !address || reused === null) {
    return {
      ok: false,
      error: "CREATOR_QRCODE_RESPONSE_INVALID",
      httpStatus: res.status,
    };
  }

  return {
    ok: true,
    qrcodeUrl,
    reused,
    targetUrl,
    username,
    address,
  };
}
