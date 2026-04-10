// lib/api/creator.ts
// Creator/user-related API calls. No apiBase parameter — always calls relative URLs.
import type { Address } from "viem";
import type { CreatorProfile, SocialLinks, YoutubeVideo } from "@/types/creator";
import type { MeStatus } from "@/lib/mypage/types";
import type { MyPageDashboardData } from "@/lib/mypage/dashboardTypes";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";
import {
  fetchMe as _fetchMe,
  fetchMyPageDashboard as _fetchMyPageDashboard,
  saveMyPageUser as _saveMyPageUser,
  requestCreatorApply as _requestCreatorApply,
  updateMyPageCreatorProfile,
  ensureCreatorProfileQrCode as _ensureCreatorProfileQrCode,
} from "@/lib/mypage/api";

export { updateMyPageCreatorProfile };

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
  return _ensureCreatorProfileQrCode(args);
}

export async function fetchMe(
  address: Address
): Promise<{ ok: true; data: MeStatus } | { ok: false; error: string }> {
  return _fetchMe({ apiBase: "", address });
}

export async function fetchMyPageDashboard(
  address: Address,
  view: WorkspaceView
): Promise<{ ok: true; data: MyPageDashboardData } | { ok: false; error: string }> {
  return _fetchMyPageDashboard({ apiBase: "", address, view });
}

export async function saveMyPageUser(args: {
  address: Address;
  username: string;
  displayName: string;
  profile: string;
}): Promise<
  { ok: true; data: MeStatus } | { ok: false; error: string; httpStatus: number }
> {
  return _saveMyPageUser({ apiBase: "", ...args });
}

export async function requestCreatorApply(
  address: Address
): Promise<
  { ok: true; data: MeStatus } | { ok: false; error: string; httpStatus: number }
> {
  return _requestCreatorApply({ apiBase: "", address });
}

// Re-export types consumed by callers
export type { CreatorProfile, SocialLinks, YoutubeVideo };
